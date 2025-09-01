import {RunnerFn} from '../types/runner.types'

export interface IRunner<T, R> {
  run: RunnerFn<T, R>
}
