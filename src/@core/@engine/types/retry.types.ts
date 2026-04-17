import {WrappedError} from '../execution/runner'

export type RetryAttempt = {
  attempt: number
  error: WrappedError
  nextMs: number
  finalAttempt: boolean
}
