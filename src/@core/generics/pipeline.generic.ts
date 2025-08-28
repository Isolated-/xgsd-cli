import EventEmitter2 from 'eventemitter2'
import {IAction, RunnerResult} from './runner.generic'
import {IPipe} from './pipe.generic'

export type PipeableAction<T = unknown> = IAction<T> & IPipe<T>
export type IPipelineStep<T = any> = {
  idx: number
  action: PipeableAction<T>
  result: RunnerResult | null
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
