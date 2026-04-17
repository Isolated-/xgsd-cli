import {WrappedError} from '../execution/error'

export type RetryAttempt = {
  attempt: number
  error: WrappedError
  nextMs: number
  finalAttempt: boolean
}
