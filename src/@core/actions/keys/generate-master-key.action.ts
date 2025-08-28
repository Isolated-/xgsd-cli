import {ActionError, IAction, RunnerContext} from '../../generics/runner.generic'
import {TransformPipe, IPipe, PipeFn} from '../../generics/pipe.generic'
import {IPipelineStep} from '../../generics/pipeline.generic'
import {IKey} from '../../keys/interfaces'
import {KeyChain} from '../../keys/keychain'
import {ActionRuntime} from '../action.runtime'

export type GenerateMasterKeyData = {
  passphrase: string
  recoveryPhrase?: string
  words?: number
}

export class GenerateMasterKey implements IAction<Record<string, any>> {
  id = 'generate-master-key'

  async run<R = {key: IKey; phrase?: string}>(ctx: RunnerContext): Promise<R> {
    const {recoveryPhrase, passphrase, words} = ctx.data as GenerateMasterKeyData

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
