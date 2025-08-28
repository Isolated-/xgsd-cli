import {IAction, RunnerContext, ActionError, RunnerResult, IRunner} from '../../generics/runner.generic'
import {IPipe, PipeFn} from '../../generics/pipe.generic'
import {IPipelineStep} from '../../generics/pipeline.generic'
import {IKey} from '../../keys/interfaces'
import {KeyChain} from '../../keys/keychain'
import {ActionRuntime} from '../action.runtime'

export type SaveKeyOpts = {
  key: IKey
}

export type SaveKeyData = {
  success: boolean
  export: string
}

export class SaveDerivedKey implements IAction<SaveKeyOpts> {
  id = SaveDerivedKey.name

  constructor(protected readonly _runner?: IRunner) {
    this._runner = _runner ?? ActionRuntime.createWithAction(this)
  }

  async run<SaveKeyData>(ctx: RunnerContext): Promise<SaveKeyData> {
    if (!ctx.data) {
      throw new ActionError('No data available to save derived key.', 'KEY_SAVE_FAILED')
    }

    const {key, result} = ctx.data

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
