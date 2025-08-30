import {config} from 'process'
import {PipelineConfig, PipelineMode, PipelineState, SourceData} from '../@types/pipeline.types'
import {IPipeline} from './interfaces/pipeline.interfaces'
import {getDefaultPipelineConfig} from './pipelines.util'
import {timedRunnerFn} from '../@shared/runner'
import {debug} from '../util/debug.util'
import {RunFn} from '../@shared/types/runnable.types'

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
  const previousOutput = config.steps[index - 1]?.output ?? config.input

  let data = config.input
  if (config.mode === PipelineMode.Chained) {
    data = previousOutput as T
  }

  const result = await timedRunnerFn(data, fn, {
    mode: 'isolated',
    retries: config.stopOnError ? 1 : config.max,
    timeout: config.timeout,
    delay: config.delay ?? ((attempt) => attempt + 100),
  })

  // update step config
  config.steps[index].errorMessage = result.errors && result.errors.length > 0 ? result.errors[0].message : null
  config.steps[index].errors = result.errors || []
  config.steps[index].input = data!
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
  config.output = config.steps.reduce((acc: any, step) => ({...acc, ...step.run}), {})
  config.errors = config.steps.reduce((acc: any, step) => [...acc, ...step.errors!], [])
  config.retries = config.steps.reduce((acc: number, step) => acc + (step.attempt ?? 0), 0)
  config.state = config.errors.length > 0 ? PipelineState.Failed : PipelineState.Completed
  config.runs = config.steps.map((step) => step.run).filter(Boolean) as any[]

  // for chained mode, input goes through to output
  if (config.mode === PipelineMode.Chained) {
    config.output = config.steps[config.steps.length - 1].output
  }

  return config
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
        errors: [],
      })),
      input: input as T,
      output: null,
      state: PipelineState.Running,
    })

    return orchestrate(config)
  }
}
