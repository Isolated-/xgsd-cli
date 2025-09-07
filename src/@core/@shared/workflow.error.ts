export enum WorkflowErrorCode {
  HardTimeout = 'CODE_HARD_TIMEOUT',
  HardDataSize = 'CODE_HARD_DATA_SIZE',
  ModuleNotFound = 'CODE_MODULE_NOT_FOUND',
  FunctionNotFound = 'CODE_FUNCTION_NOT_FOUND',
}

export class WorkflowError extends Error {
  code: string
  name: string
  message: string
  stack?: string
  original?: Error

  constructor(message: string, code: WorkflowErrorCode, original?: Error) {
    super(message)
    this.name = 'WorkflowError'
    this.message = message
    this.code = code
    this.original = original

    if (original && original.stack) {
      this.stack = original.stack
    } else {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}
