import {Args, Command, Flags} from '@oclif/core'
import {KeyChain} from '../../@core/keys/keychain'
import {decodeKey, toRawKey} from '../../@core/keys/util'
import {decodeString} from '../../@core/keys/util/format.util'
import {OsKeyStore} from '../../@core/keys/keystore'
import {KeyManager} from '../../@core/keys/interfaces/key-manager.interface'
import {IKeyOpts} from '../../@core/keys/interfaces'
import {BinaryExportable} from '../../@core/generics/exportable.generic'
import {ActionRuntime} from '../../@core/actions/action.runtime'
import {GenerateMasterKey, generateMasterKeyActionRuntime} from '../../@core/actions/keys/generate-master-key.action'
import {DeriveKeyFromMaster} from '../../@core/actions/keys/derive-key-from-master.action'
import {ActionPipeline, Pipeline} from '../../@core/actions/action.pipeline'
import {SaveKey} from '../../@core/actions/keys/save-key.action'

export default class ConfigKeys extends Command {
  static override args = {
    operation: Args.string({description: 'operation to perform on keys', options: ['generate', 'import']}),
    extra: Args.string({description: 'extra argument for the operation', required: false}),
  }
  static override aliases: string[] = ['keys']
  static override description = 'describe the command here'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    force: Flags.boolean({char: 'f', description: 'force operation without prompt'}),
    raw: Flags.boolean({description: 'output raw key without any formatting'}),
    passphrase: Flags.string({char: 'p', description: 'passphrase to encrypt the key'}),
    recovery: Flags.string({char: 'r', description: 'recovery phrase to recover the key'}),
    words: Flags.integer({char: 'w', description: 'number of words for recovery phrase', default: 24}),
    context: Flags.string({char: 'c', description: 'context for the key', default: 'default'}),
    version: Flags.integer({char: 'v', description: 'version for the key', default: 1}),
  }

  public async generate(
    passphrase: string,
    recovery: string = '',
    words: number,
    raw: boolean = false,
    forced: boolean = false,
    context: string = 'default',
    version: number = 1,
  ): Promise<void> {
    if (!passphrase) {
      this.error('passphrase must be provided to continue with key generation.')
    }

    const pipeline = Pipeline.build([new GenerateMasterKey(), new DeriveKeyFromMaster(), new SaveKey()])

    const results = await pipeline.run({
      passphrase,
      recovery,
      words,
      raw,
      forced,
      context,
      version,
    })

    console.log(results)
  }

  public async import(key: string): Promise<void> {
    const keyChain = KeyChain.fromImportString(key)

    const decoded = decodeKey(key, 'base64url')
    this.log('here is your imported key details:')
    this.log(`version: ${decoded.v}`)
    this.log(`algorithm: ${decoded.alg}`)

    this.log(`success!`)
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ConfigKeys)

    switch (args.operation) {
      case 'generate':
        await this.generate(
          flags.passphrase ?? '',
          flags.recovery,
          flags.words,
          flags.raw,
          flags.force,
          flags.context,
          flags.version,
        )
        break
      case 'import':
        if (!args.extra) {
          this.error('Please provide a key to import')
        }
        await this.import(args.extra)
        break
    }
  }
}
