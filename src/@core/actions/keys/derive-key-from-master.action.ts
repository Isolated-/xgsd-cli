import {ActionData, ActionError, IAction, IRunner, RunnerContext} from '../../generics/runner.generic'
import {IKey} from '../../keys/interfaces'
import {ActionRuntime} from '../action.runtime'

export class DeriveKeyFromMaster implements IAction<ActionData> {
  id: string = DeriveKeyFromMaster.name

  constructor(protected readonly _runner?: IRunner) {
    this._runner = _runner ?? ActionRuntime.createWithAction(this)
  }

  async run<R = {key: IKey}>(ctx: RunnerContext): Promise<R> {
    if (!ctx.data) {
      throw new ActionError('No data available to derive key from master.')
    }

    const previous = ctx.data.previous as any
    if (!previous) {
      return {key: ctx.data.key} as R
    }

    return {key: previous.result.key} as R
  }

  cancel(): void {
    throw new Error('Method not implemented.')
  }
}
