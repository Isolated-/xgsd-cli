import {RunFn} from '../@shared/types/runnable.types'
import {PipelineConfig, PipelineMode, PipelineState, SourceData} from '../@types/pipeline.types'
import {Pipeline} from './pipeline.concrete'

export const orchestration = async <T extends SourceData = SourceData, R extends SourceData = SourceData>(
  input: T,
  ...fns: RunFn<T, R>[]
): Promise<PipelineConfig<R>> => {
  const pipeline = new Pipeline(getDefaultPipelineConfig())
  return pipeline.orchestrate(input, ...(fns as any)) as Promise<PipelineConfig<R>>
}

export const getDefaultPipelineConfig = <T extends SourceData = SourceData>(
  opts?: Partial<PipelineConfig<T>>,
): PipelineConfig<T> => {
  return {
    input: null,
    output: null,
    runs: [],
    steps: [],
    errors: [],
    state: PipelineState.Pending,
    timeout: 10000,
    max: 3,
    retries: 0,
    stopOnError: false,
    mode: PipelineMode.Async,
    ...opts,
  }
}
