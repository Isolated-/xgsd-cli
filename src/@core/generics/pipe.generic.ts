import {ActionRuntime} from '../actions/action.runtime'
import {IAction} from './runner.generic'
import {IPipelineStep} from './pipeline.generic'

export type PipeFn = (data: any, previous?: IPipelineStep<any> | null) => Promise<IPipelineStep<any> | null>

export interface IPipe<T = any> {
  pipe(data: T, previous: IPipelineStep | null, next: PipeFn): Promise<IPipelineStep | null>
}

export abstract class TransformPipe implements IPipe {
  protected readonly _runner: ActionRuntime

  protected constructor(protected readonly action: IAction<any>, runner?: ActionRuntime) {
    this._runner = runner ?? ActionRuntime.createWithAction(this.action)
  }

  async pipe(data: any, previous: IPipelineStep | null, next: PipeFn): Promise<IPipelineStep | null> {
    const forwardData = await this._runner.execute(data)
    return next({...data, ...(forwardData as any)})
  }
}
