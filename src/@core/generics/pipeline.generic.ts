import EventEmitter2 from 'eventemitter2'
import {IAction, RunResult} from './action.generic'
import {IPipe} from './pipe.generic'

export type PipeableAction<T = unknown> = IAction<T> & IPipe<T>
export type IPipelineStep<T = any> = {
  idx: number
  action: PipeableAction<T>
  result: RunResult | null
  error: boolean
  retry: boolean
  retries: number
  previous: IPipelineStep<T> | null
  next: IPipelineStep<T> | null
  dependencies: number[]
}

export interface IPipeline<T = any> {
  event: EventEmitter2
  run(input: T): Promise<IPipelineStep<T>[]>
}
