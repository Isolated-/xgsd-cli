import {EventEmitter2} from 'eventemitter2'

export type ActionData = Record<string, any> | null

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
export interface IActionRuntime<T = ActionData> {
  event: EventEmitter2
  context: RunContext
  action: IAction<T>
  cancelled: boolean
  details(): string[]
  execute(data: T, action?: IAction<T>): Promise<RunResult>
  cancel(): Promise<void>
  retry(max?: number, delay?: (attempt: number) => number): Promise<RunResult>
}

export type RunContext = {
  progress: number
  data: ActionData
  errors: ActionError[] | null
  retries?: number
  max?: number
  nextRetryMs?: number
  update: (message?: string, progress?: number, total?: number) => void
  error: (error: string, code: string) => void
  [key: string]: unknown
}

export type RunResult = {
  success: boolean
  failed: boolean
  retries?: number
  max?: number
  cancelled?: boolean
  data: ActionData | null
  errors: ActionError[] | null
}

export class ActionError extends Error {
  constructor(public message: string, public code?: string) {
    super(message)
  }
}

export interface IAction<T = ActionData> {
  id: string
  run(ctx: RunContext): Promise<T>
  cancel(): void
}
