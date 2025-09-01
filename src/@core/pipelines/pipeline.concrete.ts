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

export const userCodeResultCollector = (id: string, date: string, path: string, event: EventEmitter2) => {
  const resultPath = join(path)
  ensureDirSync(resultPath)

  event.on('finish', (result) => {
    const nodeVersion = process.version
    const os = process.platform

    const firstStartedAt = result.steps.filter((step: any) => step.startedAt).pop()?.startedAt || null
    const lastEndedAt = result.steps.filter((step: any) => step.endedAt).pop()?.endedAt || null

    const report = {
      id,
      runner: result.config.runner || '',
      name: result.config.name,
      description: result.config.description || '',
      package: result.config.package || '',
      start: firstStartedAt,
      end: lastEndedAt,
      duration: result.steps.reduce((acc: number, step: any) => acc + (step.duration || 0), 0),
      state:
        result.steps.filter((step: any) => step.state === PipelineState.Completed).length > 0
          ? PipelineState.Completed
          : PipelineState.Failed,
      config: {
        ...result.config,
        node: {
          os,
          arch: process.arch,
          version: nodeVersion,
          processes: process.cpuUsage(),
          memory: process.memoryUsage(),
        },
      },
      steps: result.steps,
    }

    writeJsonSync(join(result.config.output, `report-${date}.json`), report, {spaces: 2})
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
  const id = v4()

  if (collect) {
    ensureDirSync(config.output)
  }

  if (collect?.logs) {
    userCodeLogCollector(id, date, config.output, handler)
  }

  if (collect?.run) {
    userCodeResultCollector(id, date, config.output, handler)
  }

  return runInChildProcess(id, data, config, handler)
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
      if (settled) return

      switch (msg.type) {
        case 'LOG':
          event.emit('message', msg)
          break

        case 'ATTEMPT':
          event.emit('attempt', msg.attempt)
          break

        case 'RESULT':
          event.emit('finish', msg.result)
          child.kill()
          resolve({result: msg.result})
          break
      }
    })

    // Start execution
    child.send({type: 'RUN', id, data, config})
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
