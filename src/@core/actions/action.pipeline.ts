import {EventEmitter2} from 'eventemitter2'
import {ActionError, IAction, IRunner, RunnerResult} from '../generics/runner.generic'
import {debug} from '../util/debug.util'
import {IPipe} from '../generics/pipe.generic'
import {IPipelineStep, IPipeline} from '../generics/pipeline.generic'

/**
 * Create a pipeline from a series of actions.
 * @param pipes The actions to include in the pipeline.
 * @returns A new pipeline instance.
 */
export const pipes = (...pipes: IPipe[]): Pipeline => {
  return Pipeline.build([...(pipes as any)])
}

export const runAction = async (action: IAction, runner?: IRunner) => {}

export class Pipeline<T = any> implements IPipeline<T> {
  event: EventEmitter2
  steps: IPipelineStep<T>[] = []

  private constructor(_steps: any[] = []) {
    this.event = new EventEmitter2()
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
    }))
  }

  details(index: number): IPipelineStep<T> {
    return this.steps[index]
  }

  json(): string {
    return JSON.stringify(this.steps)
  }

  async run(input: T): Promise<IPipelineStep<T>[]> {
    let results: IPipelineStep<T>[] = []

    let data: any = input
    let current: IPipelineStep = this.steps[0]

    let ahead: IPipelineStep | null = null
    let behind: IPipelineStep | null = null

    for (const [idx, step] of this.steps.entries()) {
      debug(`(run) [${idx}] ${step.action.id} (current: ${current?.action.id})`, Pipeline.name)

      const next = async (payload: any): Promise<IPipelineStep | null> => {
        data = {...data, ...payload}
        current.result = data
        return ahead
      }

      current = step
      behind = this.steps.length < idx - 1 ? this.steps[idx - 1] : null
      ahead = this.steps.length > idx + 1 ? this.steps[idx + 1] : null
      ahead = (await step.action.pipe(data, behind, next)) as any

      results.push(step)

      debug(`(run) [${idx}] ${step.action.id} (current: ${current?.action.id})`, Pipeline.name)
      debug(`(run) [${idx}] ${step.action.id} (behind: ${behind?.action.id ?? 'none'})`, Pipeline.name)
      debug(`(run) [${idx}] ${step.action.id} (ahead: ${ahead?.action.id ?? 'none'})`, Pipeline.name)

      this.event.emit('step', current)
    }

    this.event.emit('pipeline', results)
    return results
  }

  public static build(pipes: (IAction<any> & IPipe)[]): Pipeline {
    const _steps = pipes.map((action, index) => ({
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
