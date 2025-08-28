import {
  ActionError,
  DefaultActionType,
  IAction,
  IActionRuntime,
  RunContext,
  RunResult,
} from '../../generics/action.generic'
import {IExportable} from '../../generics/exportable.generic'
import {IKey} from '../../keys/interfaces'
import {KeyChain} from '../../keys/keychain'
import {PipelineTransformer} from '../action.pipeline'
import {ActionRuntime} from '../action.runtime'

export class GenerateMasterKey implements IAction<Record<string, any>> {
  id = 'generate-master-key'

  async run<R = {key: IKey; phrase?: string}>(ctx: RunContext): Promise<R> {
    const {recoveryPhrase, passphrase, words} = ctx.data

    if (!passphrase) {
      throw new ActionError('missing required fields (passphrase)', 'KEY_GEN_FAILED')
    }

    const recovery = recoveryPhrase ?? KeyChain.generateRecoveryPhrase(words || 24)

    if (!recovery) {
      throw new ActionError('failed to generate recovery phrase', 'KEY_GEN_FAILED')
    }

    const key = await KeyChain.fromRecoveryPhrase(passphrase, recovery)

    return {key, phrase: recoveryPhrase ? undefined : recovery} as R
  }

  cancel(): Promise<void> {
    return Promise.resolve()
  }
}

export const generateMasterKeyActionRuntime = () =>
  ActionRuntime.createWithAction(new GenerateMasterKey()) as IActionRuntime<{
    key: KeyChain | null
    phrase?: string
    passphrase?: string
  }>
