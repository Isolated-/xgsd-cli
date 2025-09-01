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
 *  Pipeline step configuration (simplified).
 *  Represents a single step in the pipeline.
 *  @since v1
 *  @version v1
 */
export type PipelineStep<T extends SourceData = SourceData> = {
  action?: string
  name?: string | undefined
  description?: string | undefined
  startedAt?: string | null | undefined
  endedAt?: string | null | undefined
  /**
   *  @deprecated
   */
  run: RunnerResult<T> | null
  options?: {
    retries?: number
    timeout?: number
  }
  enabled?: boolean
  input: T | null
  output?: T | null
  /**
   *  @deprecated use error/errors
   */
  errorMessage?: string | null
  state: PipelineState
  error?: WrappedError | null
  errors?: WrappedError[]

  attempt?: number

  /**
   *  @deprecated use `options.retries`
   */
  retries?: number
  fn: RunFn<T, T>

  /**
   *  @deprecated no alternative yet
   */
  validate?: ValidateFn<T>

  /**
   *  @deprecated no alternative yet
   */
  transform?<R = T>(data: T): Promise<R> | R

  /**
   *  @deprecated no alternative yet
   */
  strip?: StripFn<T>
}

export enum PipelineState {
  Pending = 'pending',
  Running = 'running',
  Retrying = 'retrying',
  Failed = 'failed',
  Completed = 'completed',
  Succeeded = 'succeeded',
  Skipped = 'skipped',
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
  /**
   *  @deprecated use retries instead
   */
  maxRetries?: number
  retries?: number

  /**
   *  @deprecated will be replaced with `error: exit`
   */
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
