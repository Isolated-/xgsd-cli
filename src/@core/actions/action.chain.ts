import {IAction, IActionChain, IActionRuntime, RunResult} from '../generics/action.generic'

export class ActionChain implements IActionChain {
  result: RunResult<unknown>[] = []

  constructor(public readonly runtime: IActionRuntime<unknown>, result?: RunResult<unknown>[]) {
    this.result = result ?? []
  }

  next(): IAction<unknown> {
    throw new Error('Method not implemented.')
  }

  execute(data: unknown): Promise<RunResult<unknown>> {
    throw new Error('Method not implemented.')
  }
}
