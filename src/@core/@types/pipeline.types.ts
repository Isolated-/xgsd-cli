import {IRunnable} from '../@shared/interfaces/runnable.interface'
import {RunnerResult, WrappedError} from '../@shared/runner'
import {RunFn} from '../@shared/types/runnable.types'
import {Require} from './require.type'

export type TransformFn<T extends SourceData = SourceData, R extends SourceData = T> = (data: T) => R
export type ValidateFn<T extends SourceData = SourceData> = (data: T) => boolean
export type StripFn<T extends SourceData = SourceData> = (data: T) => Partial<T>

/**
 *  Represents a Step in its minimum form (just the pipe)
 *  This is useful for creating new steps with minimal configuration.
 *  And also enforces type safety
 *  @since v1
 *  @version v1
 */
export type PartialStep<T extends SourceData = SourceData> = Require<PipelineStep<T>, 'fn'>

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
    next: (data?: T | null, error?: Error | Error[] | null) => Promise<PipelineStep<T> | null>
  },
) => Promise<PipelineStep<T> | null>

/**
 *  Pipeline step configuration (simplified).
 *  Represents a single step in the pipeline.
 *  @since v1
 *  @version v1
 */
export type PipelineStep<T extends SourceData = SourceData> = {
  name?: string | undefined
  description?: string | undefined
  startedAt?: string | null | undefined
  endedAt?: string | null | undefined
  run: RunnerResult<T> | null
  config?: {
    retries: number
    timeout: number
  }
  input: T | null
  output?: T | null
  errorMessage?: string | null
  state: PipelineState
  error?: WrappedError | null
  errors?: WrappedError[]
  attempt?: number
  retries?: number
  fn: RunFn<T, T>
  action?: string
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

export enum PipelineMode {
  /**
   * Runs the pipeline steps asynchronously.
   * @default
   */
  Async = 'async',

  /**
   *  Runs the pipeline steps in parallel.
   *  All pipeline functions will receive the same input data.
   */
  Fanout = 'fanout',

  /**
   * Runs the pipeline steps in a chained manner.
   * (chained != sync) as chained will *only pass the output of the previous step into the next step.*
   */
  Chained = 'chained',
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
  mode: PipelineMode
  runs: RunnerResult<T>[]
  steps: PipelineStep<T>[]
  errors: unknown[]
  timeout: number
  max: number
  retries: number
  stopOnError: boolean
  delay?: (attempt: number) => number
  transformer?: TransformFn<T>
  validator?: ValidateFn<T>
}

export type FlexiblePipelineOptions = {
  timeout?: number
  maxRetries?: number
  stopOnError?: boolean
  delay?: (attempt: number) => number
  transformer?: TransformFn
  validator?: ValidateFn
}

export type FlexiblePipelineConfig<T = SourceData> = {
  name: string | undefined
  package: string | undefined
  version: string | undefined
  mode: PipelineMode
  runner: 'xgsd@v1'
  output: string
  metadata: Record<string, unknown>
  options: FlexiblePipelineOptions
  flags: Record<string, boolean>
  steps: PipelineStep<T>[]
}

export type FlexiblePipelineResult<T = SourceData, E = Error> = {
  config: FlexiblePipelineConfig<T>
  output: T | null | undefined
  errors: E[]
}

export type SourceData<T = unknown> = string | number | boolean | null | undefined | T | Record<string, T> | T[]
