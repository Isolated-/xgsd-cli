import {
  FlexibleWorkflowConfig,
  PipelineConfig,
  PipelineMode,
  PipelineState,
  PipelineStep,
  SourceData,
} from '../@types/pipeline.types'
import {IPipeline} from './interfaces/pipeline.interfaces'
import {calculateAverageWorkflowTimeFromPath, getDefaultPipelineConfig, getDurationString} from './pipelines.util'
import {timedRunnerFn, WrappedError} from '../@shared/runner'
import {RunFn} from '../@shared/types/runnable.types'
import {EventEmitter2} from 'eventemitter2'
import {fork} from 'child_process'
import {basename, join} from 'path'
import {ensureDirSync, pathExistsSync, writeJsonSync} from 'fs-extra'
import {WorkflowContext} from '../@shared/context.builder'
import {captureEvents, WorkflowEvent} from '../workflows/workflow.events'
import {createLogger, transports, format} from 'winston'
import moment = require('moment')

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

export const workflowResultLogger = (path: string, route: string) =>
  createLogger({
    level: 'info',
    format: format.combine(
      format.timestamp(),
      // readable for humans
      format.printf(({level, message, timestamp, ...meta}) => {
        const extras = Object.keys(meta).length ? JSON.stringify(meta) : ''
        return `(${level}) ${message} (${timestamp}) ${extras}`
      }),
    ),
    transports: [
      // structured JSONL log file
      new transports.File({
        filename: join(path, route, 'generated', 'workflow-results.combined.jsonl'),
        format: format.combine(
          format.timestamp(),
          format.json(), // one JSON object per line
        ),
      }),
    ],
  })

export const userCodeLogCollector = (context: WorkflowContext<any>, path: string, event: EventEmitter2) => {
  const date = new Date()

  const today = date.toISOString().split('T')[0]

  const bucketStr = context.config.logs?.bucket || '1d'
  const value = bucketStr.slice(0, bucketStr.length - 1)
  const unit = bucketStr.charAt(bucketStr.length - 1).toLowerCase()
  const bucket = moment(date)
    .subtract(bucketStr)
    .startOf(unit as any)

  const day = bucket.format('YYYY-MM-DD')
  const hour = bucket.format('HH:mm')
  const logPath = join(context.output, 'logs')

  let humanLog = join(logPath, `logs-${unit === 'h' ? hour : day}.log`)
  let jsonlLog = join(logPath, `logs-${day}.combined.jsonl`)

  ensureDirSync(logPath)

  const logger = createLogger({
    level: 'user',
    format: format.combine(
      format.timestamp(),
      // readable for humans
      format.printf(({level, message, timestamp, ...meta}) => {
        const extras = Object.keys(meta).length ? JSON.stringify(meta) : ''
        return `(${level}) ${message} (${timestamp}) ${extras}`
      }),
    ),
    levels: {
      error: 0,
      warn: 1,
      info: 2,
      status: 3,
      success: 4,
      user: 5,
      debug: 6,
    },
    transports: [
      // human-readable log file
      new transports.File({filename: humanLog}),
      // structured JSONL log file
      new transports.File({
        filename: jsonlLog,
        format: format.combine(
          format.timestamp(),
          format.json(), // one JSON object per line
        ),
      }),
    ],
  })

  const meta = {
    cli: context.cli,
    config: context.hash,
    node: process.version,
    os: process.platform,
    runner: `xgsd@v1`,
    context: context.id,
    docker: pathExistsSync('/.dockerenv'),
  }

  event.on('message', (msg) => {
    logger.log({
      level: msg.log.level,
      message: msg.log.message,
      cli: context.cli,
      config: context.hash,
      timestamp: msg.log.timestamp,
      node: process.version,
      os: process.platform,
      runner: `xgsd@v1`,
      context: msg.log.context,
      step: msg.log.step,
      docker: pathExistsSync('/.dockerenv'),
    })
  })

  event.on('error', (msg) => {
    logger.log({
      level: 'error',
      name: msg.error.name,
      message: msg.error.message,
      step: msg.step.name || msg.step.run,
      context: msg.context.id,
      cli: msg.context.cli,
      config: msg.context.hash,
      node: process.version,
      os: process.platform,
      runner: 'xgsd@v1',
      docker: pathExistsSync('/.dockerenv'),
    })
  })
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

  // create new context
  const ctx = new WorkflowContext(config, handler, 'v' + config.cli)

  if (collect) {
    ensureDirSync(config.output)
  }

  if (collect?.logs) {
    userCodeLogCollector(ctx, config.output, ctx.stream)
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
          child.kill()
          // TODO: resolve the path to result file vs the data
          resolve({result: null})
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

    child.on('error', (error) => {
      child.kill()
    })

    // do this more gracefully in future (fixes code errors causing pipe issues)
    process.on('SIGTERM', () => child.kill())
    process.on('SIGINT', () => child.kill())
    process.on('exit', () => child.kill())

    // send context without stream of events to reduce IPC comms
    child.send({type: 'PARENT:RUN', data, context: context.serialise!()})
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
