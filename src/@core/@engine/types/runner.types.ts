import {RunFn} from './runnable.types'

export type RunnerFn<T, R> = (data: T, fn: RunFn<T, R>, next?: any) => Promise<R>
