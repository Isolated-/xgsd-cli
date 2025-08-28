import {IAction, RunContext, ActionError} from '../../generics/action.generic'
import {IKey} from '../../keys/interfaces'
import {KeyChain} from '../../keys/keychain'

export type SaveKeyOpts = {
  key: IKey
}

export type SaveKeyData = {
  success: boolean
  export: string
}

export class SaveKey implements IAction<SaveKeyOpts> {
  id = 'save-key'

  async run<SaveKeyData>(ctx: RunContext<any>): Promise<SaveKeyData> {
    const {key, result} = ctx.data

    console.log(ctx.data)

    if (!key && !result.key) {
      throw new ActionError('missing required fields (key)', 'KEY_SAVE_FAILED')
    }

    let returned = key ?? result.key

    return {success: true, export: returned.export()} as SaveKeyData
  }

  cancel(): Promise<void> {
    return Promise.resolve()
  }
}
