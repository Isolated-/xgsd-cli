import {FlexibleWorkflowConfig, PipelineState, PipelineStep, SourceData} from '../@types/pipeline.types'
import {ParentMessage} from '../pipelines/pipeline.concrete'
import * as ms from 'ms'
import {WrappedError} from './runner'
import * as lodash from 'lodash'
import {resolveStepData, resolveStepTemplates} from './runner.process'
import {fork} from 'child_process'
import {WorkflowContext} from './context.builder'
import {join} from 'path'
import {WorkflowEvent} from '../workflows/workflow.events'
import prettyBytes from 'pretty-bytes'

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

async function runStep(idx: number, step: PipelineStep, context: WorkflowContext) {
  return new Promise<{step: any; fatal: boolean; errors: any[]}>((resolve, reject) => {
    const stepProcess = fork(join(__dirname, 'workflow.step-process.js'), {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    })

    const startedAt = new Date().toISOString()

    let timeout = step.options?.timeout
    if (typeof timeout === 'string') {
      timeout = ms(timeout as ms.StringValue)
    }

    const timerHandler = () => {
      stepProcess.kill()

      const updated = {
        ...step,
        index: idx,
        startedAt: startedAt,
        endedAt: new Date().toISOString(),
        duration: new Date().getTime() - new Date(startedAt).getTime(),
        state: PipelineState.Failed,
        error: {
          name: 'timeout',
          message: 'hard timeout limit reached',
        },
        errors: [new Error('hard timeout limit reached')].map((e) => ({
          original: e,
          name: e.name,
          message: e.message,
          stack: e.stack,
        })),
      }

      event(WorkflowEvent.StepFailed, {step: updated, attempt: {error: updated.error, retries: 0, nextMs: 0}})
      resolve({
        step: {
          ...step,
          index: idx,
          startedAt: step.startedAt || startedAt,
          endedAt: new Date().toISOString(),
          duration: new Date().getTime() - new Date(step.startedAt || startedAt).getTime(),
          state: PipelineState.Failed,
          error: {
            name: 'timeout',
            message: 'hard timeout limit reached',
          },
          errors: [new Error('hard timeout limit reached')].map((e) => ({
            original: e,
            name: e.name,
            message: e.message,
            stack: e.stack,
          })),
        },
        fatal: true,
        errors: [],
      })
    }

    let timer = setTimeout(timerHandler, timeout)

    let errors: WrappedError[] = []
    stepProcess.on('message', (msg: any) => {
      switch (msg.type) {
        case 'CHILD:EVENT':
          event(msg.event, msg.payload)
          if (msg.event === WorkflowEvent.StepRetry) {
            clearTimeout(timer)
            timer = setTimeout(timerHandler, msg.payload.attempt.nextMs + 500)
            return
          }
          break
        case 'CHILD:RESULT':
          stepProcess.kill()
          clearTimeout(timer)
          resolve({step: msg.result.step, fatal: false, errors: msg.result.step.errors})
          break
        case 'CHILD:ERROR':
          stepProcess.kill()
          clearTimeout(timer)
          resolve({
            step: {
              ...step,
              state: PipelineState.Failed,
            },
            fatal: true,
            errors: [msg.error],
          })
      }
    })

    stepProcess.stdout?.on('data', (chunk) => {
      const msg = chunk.toString().trim()
      if (msg) {
        log(msg, 'user', context, step)
      }
    })

    stepProcess.stderr?.on('data', (chunk) => {
      const msg = chunk.toString().trim()
      if (msg) {
        log(msg, 'error', context, step)
      }
    })

    stepProcess.send({
      type: 'START',
      step: {
        index: idx,
        ...step,
      },
      context,
    })
  })
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
  let input = lodash.merge({}, config.data, data)

  if (config.mode === 'async') {
    const steps = await Promise.all(
      config.steps.map(async (step, idx) => {
        step.data = input
        return runStep(idx, step, context)
      }),
    )

    results = steps.filter(Boolean).map((s) => s.step)
  }

  let idx = 0
  // let child process deal with step input/output
  if (config.mode !== 'async') {
    for (const step of config.steps) {
      step.data = input

      const result = await runStep(idx, step, {
        ...context,
        steps: results,
      })

      if (config.mode === 'chained') {
        input = lodash.merge({}, input, result.step.output)
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
