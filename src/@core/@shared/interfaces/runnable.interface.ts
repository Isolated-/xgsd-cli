import {RunFn} from '../types/runnable.types'

export interface IRunnable<T, R> {
  run: RunFn<T, R>
}
