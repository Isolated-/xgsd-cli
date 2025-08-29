import {TransformFn, ValidateFn, StripFn} from '../generics/pipe.generic'

export type PipeFn<T extends SourceData = SourceData> = (
  context: PipelineConfig<T> & {previous: PipelineStep<T> | null; next: (data: T) => Promise<PipelineStep<T> | null>},
) => Promise<PipelineStep<T> | null>

export type PipelineStep<T extends SourceData = SourceData> = {
  pipe: PipeFn<T>
}

export enum PipelineState {
  Pending = 'pending',
  Running = 'running',
  Retrying = 'retrying',
  Failed = 'failed',
  Completed = 'completed',
  Succeeded = 'succeeded',
}

export type PipelineConfig<T extends SourceData = SourceData> = {
  input: T
  output: T
  state: PipelineState
  runs: unknown[]
  steps: PipelineStep<T>[]
  errors: unknown[]
  timeout: number
  max: number
  retries: number
  setup?: (data: T) => Promise<void | T>
  transformer?: TransformFn<T>
  validator?: ValidateFn<T>
  strip?: StripFn<T>
}

export type SourceData = Record<string, unknown>
