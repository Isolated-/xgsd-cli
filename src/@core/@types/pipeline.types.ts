import {TransformFn, ValidateFn, StripFn} from '../generics/pipe.generic'
import {RunnerContext, RunnerResult} from '../generics/runner.generic'
import {Require} from './require.type'

/**
 *  Represents a Step in its minimum form (just the pipe)
 *  This is useful for creating new steps with minimal configuration.
 *  And also enforces type safety
 *  @since v1
 *  @version v1
 */
export type PartialStep<T extends SourceData = SourceData> = Require<PipelineStep<T>, 'pipe'>

/**
 *  New PipeFn function vs interface for flexibility.
 *  Will be used for user plugins/extensions in future
 *  In addition to existing use cases.
 *  @since v1
 *  @version v1
 */
export type PipeFn<T extends SourceData = SourceData> = (
  context: PipelineConfig<T> & {
    previous: PipelineStep<T> | null
    next: (data?: T | null) => Promise<PipelineStep<T> | null>
  },
) => Promise<PipelineStep<T> | null>

/**
 *  Pipeline step configuration (simplified).
 *  Represents a single step in the pipeline.
 *  @since v1
 *  @version v1
 */
export type PipelineStep<T extends SourceData = SourceData> = {
  run: RunnerResult | null
  state: PipelineState
  pipe: PipeFn<T>
  validate?: ValidateFn<T>
  transform?<R = T>(data: T): Promise<R> | R
  strip?: StripFn<T>
}

export enum PipelineState {
  Pending = 'pending',
  Running = 'running',
  Retrying = 'retrying',
  Failed = 'failed',
  Completed = 'completed',
  Succeeded = 'succeeded',
}

/**
 *  Pipeline configuration (simplified).
 *  Represents the entire pipeline configuration.
 *  @note not all properties are implemented yet.
 *  @since v1
 *  @version v1
 */
export type PipelineConfig<T extends SourceData = SourceData> = {
  input: T | null | undefined
  output: T | null | undefined
  state: PipelineState
  runs: RunnerResult[]
  steps: PipelineStep<T>[]
  errors: unknown[]
  timeout: number
  max: number
  retries: number
  stopOnError: boolean
  setup?: (data: T) => Promise<void | T>
  transformer?: TransformFn<T>
  validator?: ValidateFn<T>
  strip?: StripFn<T>
}

export type SourceData = Record<string, unknown>
