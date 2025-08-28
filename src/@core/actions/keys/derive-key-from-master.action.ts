import {DefaultActionType, IAction, RunContext} from '../../generics/action.generic'
import {IKey} from '../../keys/interfaces'
import {KeyChain} from '../../keys/keychain'

export class DeriveKeyFromMaster implements IAction {
  id: string = DeriveKeyFromMaster.name

  async run<R = {key: IKey}>(ctx: RunContext<DefaultActionType>): Promise<R> {
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
