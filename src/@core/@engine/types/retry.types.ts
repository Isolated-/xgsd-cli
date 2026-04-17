import {WrappedError} from '../runner'

export type RetryAttempt = {
  attempt: number
  error: WrappedError
  nextMs: number
  finalAttempt: boolean
}
