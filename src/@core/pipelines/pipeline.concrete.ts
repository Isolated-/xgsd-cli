import {config} from 'process'
import {
  FlexibleWorkflowConfig,
  PipelineConfig,
  PipelineMode,
  PipelineState,
  PipelineStep,
  SourceData,
} from '../@types/pipeline.types'
import {IPipeline} from './interfaces/pipeline.interfaces'
import {getDefaultPipelineConfig} from './pipelines.util'
import {timedRunnerFn, WrappedError} from '../@shared/runner'
import {debug} from '../util/debug.util'
import {RunFn} from '../@shared/types/runnable.types'
import {EventEmitter2} from 'eventemitter2'
import {fork} from 'child_process'
import {dirname, join} from 'path'
import {createWriteStream, ensureDirSync, writeJsonSync, WriteStream} from 'fs-extra'
import {v4} from 'uuid'
import {reject} from 'lodash'
import {WorkflowContext} from '../@shared/context.builder'

/**
 *  Orchestrates a single step in the pipeline.
 *  @param config - The pipeline configuration.
 *  @param {RunFn} fn - The function to run for this step.
 *  @param {number} index - The index of the step in the pipeline.
 *  @note state is mutated by this function, so use with caution.
 */
const orchestrateStep = async <T extends SourceData = SourceData>(
  config: PipelineConfig<T>,
  fn: RunFn<T, T>,
  index: number,
): Promise<void> => {
  const previousOutput = config.steps[index - 1]?.output || config.input

  let data = config.input
  if (config.mode === PipelineMode.Chained) {
    data = previousOutput as T
  }

  const result = await timedRunnerFn(data, fn, {
    mode: 'local',
    retries: config.stopOnError ? 1 : config.max,
    timeout: config.timeout,
    delay: config.delay ?? ((attempt) => attempt + 100),
  })

  // update step config
  config.steps[index].input = data ?? null
  config.steps[index].errorMessage = result.errors && result.errors.length > 0 ? result.errors[0].message : null
  config.steps[index].errors = (result.errors as WrappedError[]) || []
  config.steps[index].run = result.data ?? null
  config.steps[index].output = result.data ?? null
  config.steps[index].state = result.errors && result.errors.length > 0 ? PipelineState.Failed : PipelineState.Succeeded
  config.steps[index].attempt = result.retries
}

/**
 *  Orchestrates the pipeline.
 *  @param config - The pipeline configuration.
 *  @returns The updated pipeline configuration.
 *  @note state is mutated by this function, so use with caution.
 */
const orchestrate = async <T extends SourceData = SourceData>(
  config: PipelineConfig<T>,
): Promise<PipelineConfig<T>> => {
  if (config.mode !== PipelineMode.Async) {
    // If not async, run steps synchronously
    for (const [idx, step] of config.steps.entries()) {
      await orchestrateStep(config, step.fn!, idx)
    }
  } else {
    await Promise.all(config.steps.map((step, idx) => orchestrateStep(config, step.fn!, idx)))
  }

  // perform aggregations
  config.output = config.steps.reduce((acc: any, step) => ({...acc, ...step.output!}), {})
  config.errors = config.steps.reduce((acc: any, step) => [...acc, ...step.errors!], [])
  config.retries = config.steps.reduce((acc: number, step) => acc + (step.attempt ?? 0), 0)
  config.state = config.errors.length > 0 ? PipelineState.Failed : PipelineState.Completed
  config.runs = config.steps.map((step) => step.output).filter(Boolean) as any[]

  // for chained mode, input goes through to output
  if (config.mode === PipelineMode.Chained) {
    config.output = config.steps[config.steps.length - 1].output
  }

  return config
}

export const userCodeLogCollector = (id: string, date: string, path: string, event: EventEmitter2) => {
  const logPath = join(path, 'logs')
  ensureDirSync(logPath)

  const writeStream = createWriteStream(join(logPath, `logs-${date}.log`), {flags: 'a'})

  event.on('message', (msg) => {
    writeStream.write(`(${msg.log.level}) ${msg.log.message}\n`)
  })
}

export const userCodeErrorCollector = (context: WorkflowContext<any>) => {
  context.stream.on('error', (error) => {
    console.error('error received', error)
  })
}

export const userCodeResultCollector = (ctx: WorkflowContext<any>, date: string, path: string) => {
  const resultPath = join(path)

  ctx.stream.on('finish', (result) => {
    const nodeVersion = process.version
    const os = process.platform

    const firstStartedAt = result.steps.filter((step: any) => step.startedAt).pop()?.startedAt || null
    const lastEndedAt = result.steps.filter((step: any) => step.endedAt).pop()?.endedAt || null

    const report = {
      id: ctx.id,
      runner: ctx.runner,
      name: ctx.name,
      description: ctx.description,
      package: ctx.package,
      output: ctx.config.output,
      start: firstStartedAt,
      end: lastEndedAt,
      duration: result.steps.reduce((acc: number, step: any) => acc + (step.duration || 0), 0),
      state:
        result.steps.filter((step: any) => step.state === PipelineState.Completed).length > 0
          ? PipelineState.Completed
          : PipelineState.Failed,
      config: {
        ...ctx.config,
        node: {
          os,
          arch: process.arch,
          version: nodeVersion,
          processes: process.cpuUsage(),
          memory: process.memoryUsage(),
        },
      },
      steps: result.steps.map((step: any) => ({
        id: step.index,
        name: step.name,
        description: step.description,
        input: step.input || null,
        output: step.output || null,
        errors: step.errors
          ? step.errors.map((e: WrappedError) => ({name: e.name, message: e.message, stack: e.stack}))
          : [],
        state: step.state,
        start: step.startedAt,
        end: step.endedAt,
        duration: step.duration,
      })),
    }

    ensureDirSync(ctx.config.output)
    writeJsonSync(join(ctx.config.output, `report-${date}.json`), report, {spaces: 2})
  })
}

export const captureEvents = (context: WorkflowContext<any>) => {
  context.stream.on('event', (event) => {})
}

// remove the export once complete
export const userCodeOrchestration = async <T extends SourceData = SourceData>(
  data: any,
  config: any,
  event?: EventEmitter2,
) => {
  const handler = event ?? new EventEmitter2()
  const {collect} = config

  const date = new Date().toISOString().replace(/:/g, '-')
  const id = v4()

  // create new context
  const ctx = new WorkflowContext(config, handler)

  if (collect) {
    ensureDirSync(config.output)
  }

  if (collect?.logs) {
    userCodeLogCollector(id, date, config.output, ctx.stream)
  }

  if (collect?.run) {
    userCodeResultCollector(ctx, date, config.output)
  }

  captureEvents(ctx)

  return runWorkflow(data, ctx)
}

export type ParentMessage<T> =
  | {
      type: 'PARENT:START'
      context: WorkflowContext<T>
    }
  | {
      type: 'PARENT:RESULT'
      context: WorkflowContext<T>
      output: T
      result: PipelineStep<T>[]
    }
  | {
      type: 'PARENT:ERROR'
      context: WorkflowContext<T>
      error: WrappedError
    }
  | {
      type: 'PARENT:LOG'
      context: WorkflowContext<T>
      message: {level: string; message: string}
    }
  | {
      type: 'PARENT:RUN'
      data: T
      context: WorkflowContext<T>
    }

export function runWorkflow<T extends SourceData = SourceData>(data: T, context: WorkflowContext<T>) {
  // NOTE: reject() is only used for fatal errors
  return new Promise((resolve, reject) => {
    const workerPath = join(__dirname, '..', '@shared', 'workflow.process.js')
    const child = fork(workerPath, [context.package!], {stdio: ['inherit', 'inherit', 'inherit', 'ipc']})

    child.on('message', (msg: any) => {
      switch (msg.type) {
        case 'PARENT:LOG':
          context.stream.emit('message', msg)
          break

        case 'PARENT:RESULT':
          context.stream.emit('finish', msg.result)
          child.kill()
          resolve({result: msg.result})
          break

        case 'PARENT:ERROR':
          context.stream.emit('error', msg)
          break

        case 'PARENT:EVENT':
          context.stream.emit('event', {
            event: msg.event,
            payload: msg.payload,
          })
          break
      }
    })

    child.send({type: 'PARENT:RUN', data, context})
  })
}

export function runInChildProcess<T extends SourceData = SourceData, R = any>(
  id: string,
  data: T,
  config: FlexibleWorkflowConfig,
  event: EventEmitter2,
): Promise<{result: R}> {
  let settled = false
  let retries = 0

  return new Promise((resolve) => {
    const workerPath = join(__dirname, '..', '@shared', 'runner.process.js')
    const child = fork(workerPath, [config.package!], {stdio: ['inherit', 'inherit', 'inherit', 'ipc']})

    child.on('message', (msg: any) => {
      switch (msg.type) {
        case 'LOG':
          event.emit('message', msg)
          break

        case 'ATTEMPT':
          event.emit('attempt', msg.attempt)
          break

        case 'PARENT:RESULT':
          event.emit('finish', msg.result)
          child.kill()
          resolve({result: msg.result})
          break
        case 'ERROR':
          //event.emit('error', msg.error)
          console.log('error received', msg.error)
          child.kill()
          break
      }
    })

    // Start execution
    child.send({type: 'PARENT:RUN', id, data, config})
  })
}

export class Pipeline<T extends SourceData = SourceData> implements IPipeline<T> {
  constructor(public config: PipelineConfig<T>) {}

  /**
   *  The main entry point into the Pipeline. Accepts input and an array of functions to run.
   *  @param input
   *  @param fns
   *  @returns {PipelineConfig<T>} the updated pipeline configuration.
   */
  async orchestrate(input: T | null, ...fns: RunFn<T, T>[]): Promise<PipelineConfig<T>> {
    const config = getDefaultPipelineConfig<T>({
      ...this.config,
      steps: fns.map((c) => ({
        input: null,
        output: null,
        run: null,
        fn: c,
        state: PipelineState.Pending,
        error: null,
        errors: [],
      })),
      input: input as T,
      output: null,
      state: PipelineState.Running,
    })

    if (fns.length === 0) {
      return {
        ...config,
        state: PipelineState.Completed,
      }
    }

    return orchestrate(config)
  }
}
