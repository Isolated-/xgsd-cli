import {config} from 'process'
import {PipeFn, PipelineConfig, PipelineState, PipelineStep, SourceData} from '../@types/pipeline.types'
import {IPipeline} from './interfaces/pipeline.interfaces'
import {getDefaultPipelineConfig} from './pipelines.util'
import {timedRunnerFn as runnerFn} from '../@shared/runner'
import {debug} from '../util/debug.util'

export const runPipelineStep = async <T extends SourceData>(
  config: PipelineConfig<T>,
  step: PipelineStep<T>,
  index: number,
): Promise<PipelineStep<T> | null> => {
  const next = async (data?: any | null, errors?: Error | Error[]) => {
    let outputData = data || config.input

    if (data instanceof Promise) {
      outputData = await data
    }

    if (outputData) {
      config.output = {...outputData, ...config.output}
    }

    config.input = config.output

    config.steps[index].run = outputData
    config.steps[index].state = PipelineState.Succeeded

    config.runs.push(outputData as any)
    return config.steps[index + 1] ?? null
  }

  const result = await runnerFn(
    {
      ...config,
      previous: config.steps[index - 1] ?? null,
      next,
    },
    step.pipe as PipeFn,
    {
      retries: config.stopOnError ? 1 : config.max,
      attempt: config.steps[index].attempt ?? 0,
      timeout: config.timeout,
      onAttempt(attempt, error, cancel) {
        debug(`function is currently failing, attempt: ${attempt}`, runPipelineStep.name, step.pipe.name || 'usercode')

        config.errors.push(error)

        // update step
        config.steps[index].state = PipelineState.Retrying
        config.steps[index].attempt = attempt + 1
        config.steps[index].retries = (config.steps[index].retries ?? 0) + 1

        if (config.stopOnError) {
          cancel()
        }
      },
    },
  )

  config.retries = config.retries + (config.steps[index].retries ?? 0)

  if (result.error) {
    config.steps[index].state = PipelineState.Failed
    debug(`(error) ${step.pipe.name} failed with error: ${result.error.message}`, runPipelineStep.name)
    return config.steps[index + 1] ?? null
  }

  debug(`step finished with state: ${config.steps[index].state}`, runPipelineStep.name, step.pipe.name)

  return result.data ?? null
}

export const runPipeline = async <T extends SourceData>(initial: PipelineConfig<T>): Promise<PipelineConfig<T>> => {
  let current: PipelineStep<T> | null = initial.steps[0] ?? null
  let index = 0

  debug(
    `pipeline starting up, number of steps: ${initial.steps.length}, current step: ${index + 1}`,
    runPipelineStep.name,
    'pipeline',
  )

  const start = performance.now()

  while (current && current.state !== PipelineState.Failed && current.state !== PipelineState.Succeeded) {
    // keep this sanity check here
    if (!current) break

    debug(`executing step ${current.pipe.name} (${index + 1}) now...`, runPipeline.name, 'pipeline')

    current = await runPipelineStep(initial, current, index)

    debug(
      `finished step ${index + 1}, next step: ${current?.pipe.name ?? 'no next step'}`,
      runPipeline.name,
      'pipeline',
    )

    if (initial.steps[index].state === PipelineState.Failed && initial.stopOnError) {
      break
    }

    index++
  }

  // determine final state
  initial.state = PipelineState.Succeeded

  const failedSteps = initial.steps.filter((c) => c.state === PipelineState.Failed)
  const successfulSteps = initial.steps.filter((c) => c.state === PipelineState.Succeeded)

  const end = performance.now()
  debug(
    `pipeline has been completed, completed ${initial.steps.length} steps in ${(end - start).toFixed(2)}ms`,
    runPipeline.name,
    'pipeline',
  )

  // succeeded = no failed steps
  if (failedSteps.length === 0) {
    initial.state = PipelineState.Succeeded
    return initial
  }

  // complete = some succeeded steps and some failed steps
  if (failedSteps.length >= 0 && successfulSteps.length >= 0) {
    initial.state = PipelineState.Completed
    return initial
  }

  initial.state = PipelineState.Failed
  return initial
}

export class Pipeline<T extends SourceData = SourceData> implements IPipeline<T> {
  constructor(public config: PipelineConfig<T>) {}

  async run(input: T): Promise<PipelineConfig<T>> {
    let config = getDefaultPipelineConfig<T>({
      ...this.config,
      input,
      output: null,
      state: PipelineState.Running,
    })

    return runPipeline<T>(config)
  }
}
