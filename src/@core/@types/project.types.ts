import {WrappedError} from '../@shared/runner'
import {RunFn} from '../@shared/types/runnable.types'

export enum ProjectState {
  Pending = 'pending',
  Running = 'running',
  Retrying = 'retrying',
  Waiting = 'waiting',
  Failed = 'failed',
  Completed = 'completed',
  Succeeded = 'succeeded',
  Skipped = 'skipped',
}

export enum ProjectMode {
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

export type Project<T extends SourceData = any> = {
  name: string | undefined
  description: string | undefined
  package: string | undefined
  version: string | undefined
  enabled: boolean
  mode: ProjectMode
  print?: {
    input?: boolean
    output?: boolean
  }
  data?: Record<string, T> | null
  collect?: {
    logs?: boolean
    run?: boolean
  }
  logs?: {
    bucket?: string
    path?: string
  }
  output: string
  metadata: Record<string, unknown>
  options: ProjectOptions
  flags: Record<string, boolean>
  blocks: Block<T>[]
}

export type ProjectOptions = {
  timeout?: number
  backoff?: 'exponential' | 'linear' | 'squaring'
  retries?: number
  concurrency?: number
  delay?: string | number
}

export type Block<T extends SourceData = any> = {
  name?: string | undefined
  description?: string | undefined
  startedAt?: string | null | undefined
  endedAt?: string | null | undefined
  duration?: number | null | undefined
  env?: Record<string, string> | null
  run: string | null
  if?: string | boolean | null
  after?: Record<string, unknown> | null
  options?: ProjectOptions | null
  enabled?: boolean
  input: T | null
  data?: Record<string, T> | null
  with?: Record<string, unknown> | null
  output?: T | null
  state: ProjectState
  error?: WrappedError | null
  errors?: WrappedError[]

  attempt?: number
  fn: RunFn<T, T>
}

export type SourceData<T = unknown> = string | number | boolean | null | undefined | T | Record<string, T> | T[]
