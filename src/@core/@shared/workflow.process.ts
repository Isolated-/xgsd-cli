import {FlexibleWorkflowConfig, PipelineState, PipelineStep, SourceData} from '../@types/pipeline.types'
import {ParentMessage} from '../pipelines/pipeline.concrete'
import * as ms from 'ms'
import {resolveStepData, resolveStepTemplates} from './runner.process'
import {fork, ForkOptions} from 'child_process'
import {WorkflowContext} from './context.builder'
import {join} from 'path'
import {WorkflowEvent} from '../workflows/workflow.events'
import {deepmerge} from '../util/object.util'

const log = (
  message: string,
  level: 'info' | 'status' | 'retry' | 'success' | 'warn' | 'error' | 'user' = 'info',
  context: WorkflowContext,
  step: PipelineStep,
) => {
  process.send!({
    type: 'PARENT:LOG',
    log: {context: context.id, step: step.name || step.run, level, message, timestamp: new Date().toISOString()},
  })
}

const event = (name: string, payload: object) => {
  process.send!({type: 'PARENT:EVENT', event: name, payload})
}

export enum WorkflowErrorCode {
  HardTimeout = 'CODE_HARD_TIMEOUT',
  ModuleNotFound = 'CODE_MODULE_NOT_FOUND',
  FunctionNotFound = 'CODE_FUNCTION_NOT_FOUND',
}

export class WorkflowError extends Error {
  code: string
  name: string
  message: string
  stack?: string
  original?: Error

  constructor(message: string, code: WorkflowErrorCode, original?: Error) {
    super(message)
    this.name = 'WorkflowError'
    this.message = message
    this.code = code
    this.original = original

    if (original && original.stack) {
      this.stack = original.stack
    } else {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export class ProcessManager {
  process: any
  startedAt: number

  constructor(
    public step: PipelineStep,
    public context: WorkflowContext,
    public path: string,
    public timeoutMs?: number,
  ) {
    this.startedAt = Date.now()
  }

  fork(args: ForkOptions[] = []) {
    this.process = fork(this.path, {
      stdio: args.length ? (['pipe', 'pipe', 'pipe', 'ipc'] as any) : (['pipe', 'pipe', 'pipe', 'ipc'] as any),
      env: {
        GSD_WORKFLOW_ID: this.context.id,
        GSD_WORKFLOW_HASH: this.context.hash,
        ...this.step.env,
      },
      execArgv: ['--max-old-space-size=256'],
    })

    this.process.stdout?.on('data', (chunk: Buffer) => {
      const msg = chunk.toString().trim()
      if (msg) log(msg, 'user', this.context, this.step)
    })

    this.process.stderr?.on('data', (chunk: Buffer) => {
      const msg = chunk.toString().trim()
      if (msg) log(msg, 'error', this.context, this.step)
    })

    process.on('exit', () => {
      this.process.kill()
    })
  }

  run(prefix: string = 'CHILD'): Promise<{step: any; fatal: boolean; errors: any[]}> {
    return new Promise((resolve) => {
      let timer: NodeJS.Timeout | null = null

      const timerHandler = () => {
        this.process.kill()
        const error = new WorkflowError('hard timeout limit reached', WorkflowErrorCode.HardTimeout)
        const updated = {
          ...this.step,
          startedAt: new Date(this.startedAt).toISOString(),
          endedAt: new Date().toISOString(),
          duration: Date.now() - this.startedAt,
          state: PipelineState.Failed,
          error,
          errors: [error],
        }

        event(WorkflowEvent.StepFailed, {
          step: updated,
          attempt: {error: updated.error, retries: 0, nextMs: 0, finalAttempt: true},
        })

        resolve({step: updated, fatal: true, errors: []})
      }

      if (this.timeoutMs) {
        timer = setTimeout(timerHandler, this.timeoutMs)
      }

      this.process.on('message', (msg: any) => {
        switch (msg.type) {
          case `${prefix}:EVENT`:
            event(msg.event, msg.payload)

            if (msg.event === WorkflowEvent.StepRetry) {
              if (timer) clearTimeout(timer)
              timer = setTimeout(timerHandler, this.timeoutMs! + msg.payload.attempt.nextMs + 500)
            }

            if (msg.event === WorkflowEvent.StepStarted) {
              if (timer) clearTimeout(timer)
              timer = setTimeout(timerHandler, this.timeoutMs! + 1000)
            }
            break

          case `${prefix}:RESULT`:
            this.process.kill()
            if (timer) clearTimeout(timer)
            resolve({step: msg.result.step, fatal: false, errors: msg.result.step.errors})
            break

          case `${prefix}:ERROR`:
            this.process.kill()
            if (timer) clearTimeout(timer)
            resolve({
              step: {...this.step, state: PipelineState.Failed},
              fatal: true,
              errors: [msg.error],
            })
            break
        }
      })

      // send start command
      this.process.send({type: 'START', step: this.step, context: this.context})
    })
  }
}

async function runStep(idx: number, step: PipelineStep, context: WorkflowContext) {
  const startedAt = new Date().toISOString()
  let timeoutMs: number | undefined
  if (step.options?.timeout) {
    timeoutMs =
      typeof step.options.timeout === 'string' ? ms(step.options.timeout as ms.StringValue) : step.options.timeout
  }

  const envResolved = resolveStepData(step.env || {}, {
    context,
    step,
  })

  step.env = envResolved as Record<string, string>

  const path = join(__dirname, 'workflow.step-process.js')
  const manager = new ProcessManager({...step, index: idx, startedAt}, context, path, timeoutMs)
  manager.fork()
  return manager.run()
}

process.on('message', async (msg: ParentMessage<SourceData>) => {
  if (msg.type !== 'PARENT:RUN') return

  const {context, data} = msg
  const {config} = context

  context.start = new Date().toISOString()
  context.state = PipelineState.Running
  event(WorkflowEvent.WorkflowStarted, {context})

  let results: PipelineStep[] = []

  // input data must be an object (validate on command side)
  let input = deepmerge(config.data, data) || {}

  if (config.mode === 'async') {
    const steps = await Promise.all(
      config.steps.map(async (step, idx) => {
        step.data = input as any
        return runStep(idx, step, context)
      }),
    )

    results = steps.filter(Boolean).map((s) => s.step)
  }

  let idx = 0
  // let child process deal with step input/output
  if (config.mode !== 'async') {
    for (const step of config.steps) {
      step.data = input as any

      const result = await runStep(idx, step, {
        ...context,
        steps: results,
      })

      if (config.mode === 'chained') {
        input = deepmerge(input, result.step.output)!
      }

      results.push(result.step)
      idx++
    }
  }

  context.end = new Date().toISOString()
  context.duration = new Date(context.end).getTime() - new Date(context.start).getTime()
  context.state = PipelineState.Completed

  event(WorkflowEvent.WorkflowCompleted, {context, steps: results})
  process.send!({
    type: 'PARENT:RESULT',
    result: {
      context,
      config,
      steps: results,
    },
  })
})
