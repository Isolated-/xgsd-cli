import {EventEmitter2} from 'eventemitter2'
import {ActionError, IAction, IActionRuntime, RunResult} from '../generics/action.generic'
import {ActionRuntime} from './action.runtime'

export type PipelineTransformer<T = any> = (data: T) => T

export type IActionPipelineItem = {
  index: number
  previous: IActionPipelineItem | null
  next: IActionPipelineItem | null
  runtime: IActionRuntime
  transformer: PipelineTransformer
}

export interface IActionPipeline {
  event: EventEmitter2
  getResults(): RunResult<unknown>[]
}

export type IPipelineStep<T = any> = {
  idx: number
  action: IAction<T>
  result: RunResult<T> | null
  error: boolean
  retry: boolean
  retries: number
  previous: IPipelineStep<T> | null
  next: IPipelineStep<T> | null
  dependencies: number[]
  transformer: PipelineTransformer<T>
}

export interface IPipeline<T = any> {
  event: EventEmitter2
  run(input: T): Promise<IPipelineStep<T>[]>
}

export class Pipeline<T = any> implements IPipeline<T> {
  event: EventEmitter2

  steps: IPipelineStep<T>[]

  private constructor(_steps: Partial<IPipelineStep<T>>[] = []) {
    this.event = new EventEmitter2()

    if (!_steps) {
      _steps = []
    }

    this.steps = _steps.map((s: any, index) => ({
      idx: s.idx ?? index,
      action: s.action,
      previous: s.previous ?? _steps[index - 1] ?? null,
      next: s.next ?? _steps[index + 1] ?? null,
      retry: s.retry ?? false,
      retries: s.retries ?? 0,
      result: null,
      error: false,
      dependencies: s.dependencies ?? [],
      transformer: s.transformer ?? ((data) => data),
    }))
  }

  async run(input: T): Promise<IPipelineStep<T>[]> {
    let results: IPipelineStep<T>[] = []

    let runner: IActionRuntime<T>
    let result: RunResult<T> | null
    let previous: IPipelineStep | null = null

    for (const [idx, step] of this.steps.entries()) {
      runner = ActionRuntime.createWithAction(step.action as any) as IActionRuntime<T>
      result = await runner.execute((previous as T) ?? input)

      const next = this.steps[idx + 1] ?? null
      const prev = this.steps[idx - 1] ?? null
      const current = {...step, result, next, previous: prev}
      previous = prev

      results.push(current)

      this.event.emit(`action`, current, previous)
    }

    this.event.emit(`pipeline`, results)

    return results
  }

  public static build(actions: IAction[]): Pipeline {
    const _steps = actions.map((action, index) => ({
      idx: index,
      action,
      result: null,
      error: false,
      retry: false,
      retries: 0,
      previous: null,
      next: null,
      dependencies: [],
      transformer: (data: unknown) => data,
    }))
    return new Pipeline(_steps as any)
  }
}

export class ActionPipeline {
  head: IActionPipelineItem | null = null
  private _results: RunResult<unknown>[] = []

  constructor(private readonly runtimes: IActionRuntime[]) {
    runtimes.reduce((prev: any, runtime, index) => {
      const item: IActionPipelineItem = {
        index,
        previous: prev,
        next: null,
        runtime,
        transformer: (data) => data,
      }
      if (prev) {
        prev.next = item
      } else {
        this.head = item
      }
      return item
    }, null)
  }

  getResults(): RunResult<unknown>[] {
    return this._results
  }

  async execute(input: unknown): Promise<RunResult<unknown>[] | null> {
    const current = this.head

    if (!current) {
      return this._results
    }

    try {
      const result = await current.runtime.execute(input)
      this._results.push(result)

      if (!current.next) {
        this.head = null
      } else {
        this.head = current.next
      }

      const transformed = current.transformer(result)
      return this.execute(transformed)
    } catch (error) {
      throw new ActionError('pipeline execution failed', 'PIPELINE_EXECUTION_FAILED')
    }
  }
}
