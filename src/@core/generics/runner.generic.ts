import {throws} from 'assert'
import {EventEmitter2} from 'eventemitter2'
import {ActionError, ActionErrorCode} from '../errors/action.error'
import {RuntimeErrorCode} from '../errors/runtime.error'
import {SourceData} from '../@types/pipeline.types'

export type ActionData = Record<string, any> | null

export interface IAction extends SourceData {
  id: string
  run<R extends SourceData = SourceData>(ctx: RunnerContext): Promise<R>
  cancel(): void
}

export type RunActionFn = (context: RunnerContext) => Promise<RunnerResult>

/**
 *  A lightweight and flexible executor of Actions (micro-tasks) that can be used with Pipelines
 *  To orchestrate complex workflows and data transformations without boilerplate.
 *
 *  The ActionRuntime class is responsible for executing actions and managing their lifecycle.
 *  Failure, retries, and back off logic is all managed by the ActionRuntime allowing for easy implementation
 *  Of just about anything in the back end.
 *
 *  Consume events published by the ActionRuntime class to update progress in UI, or perform other tasks.
 *
 *  Instead of interacting with this class directly, considering using Pipelines and Pipes (inspired by RxJS, BullMQ, Nest.js, etc).
 *  Example usage:
 *  const pipes = pipeline(new GenerateMasterKeyPipe(), DeriveKeyPipe(), UpdateKeyStorePipe())
 *  await pipes.run(data)
 *
 *  @author Michael Palmer
 *  @note Whilst the main ActionRuntime is built for local use, this could easily be extended to support BullMQ (for example)
 *  @version @runtime v1 (xgsd@v1)
 *  @since v0.1
 */
export interface IRunner<T extends SourceData = SourceData> {
  event: EventEmitter2
  context: RunnerContext
  action: IAction | null
  cancelled: boolean
  details(): string[]
  execute<R extends SourceData = T>(data: T, action?: IAction, context?: Partial<RunnerContext>): Promise<R>
  cancel(): Promise<void>
  retry(
    max?: number,
    delay?: (attempt: number) => number,
    context?: RunnerContext,
    action?: IAction,
    error?: unknown,
  ): Promise<RunnerResult>
}

// TODO: implement this interface for collecting and storing logs to file
export interface IRunnerLogCollector {}

// TODO: simplify this into data and functions/utilities/hooks
export type RunnerContext = {
  action: IAction | null
  version?: string
  progress?: number
  data: ActionData
  errors: ActionError[] | null
  retries?: number
  max?: number
  timeout?: number
  nextRetryMs?: number
  stream?: EventEmitter2
  delay?: (attempt: number) => number
  update: (data: Record<string, any>, progress?: number, total?: number) => void
  failing?: (code: ActionErrorCode) => void
  error: (code: RuntimeErrorCode) => void
  abort?: () => void
  [key: string]: unknown
}

export interface RunnerResult extends SourceData {
  context?: RunnerContext
  success: boolean
  failed?: boolean
  retries?: number
  max?: number
  cancelled?: boolean
  data: ActionData | null
  errors?: ActionError[] | null
}
