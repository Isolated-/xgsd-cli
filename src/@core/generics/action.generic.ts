import {EventEmitter2} from 'eventemitter2'
import {PipelineTransformer} from '../actions/action.pipeline'

export type DefaultActionType = Record<string, any>
export type RunContext<T = DefaultActionType> = {
  progress: number
  data: T
  errors: ActionError[] | null
  retries?: number
  max?: number
  nextRetryMs?: number
  update: (message?: string, progress?: number, total?: number) => void
  [key: string]: unknown
}

export type RunResult<T = DefaultActionType> = {
  success: boolean
  failed: boolean
  retries?: number
  max?: number
  cancelled?: boolean
  data: T | null
  errors: ActionError[] | null
}

export class ActionError extends Error {
  constructor(public message: string, public code?: string) {
    super(message)
  }
}

export interface IAction<T = DefaultActionType> {
  id: string
  transformer?: PipelineTransformer<T>
  run<R = T>(ctx: RunContext<T>): Promise<R>
  cancel(): void
}

export interface IActionRuntime<T = unknown> {
  event: EventEmitter2
  context: RunContext<T>
  action: IAction<T>
  cancelled: boolean
  details(): string[]
  execute(data: T, action?: IAction<T>): Promise<RunResult<T>>
  cancel(): Promise<void>
  retry(max?: number, delay?: (attempt: number) => number): Promise<RunResult<T>>
}
