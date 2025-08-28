import {Args, Command, Flags} from '@oclif/core'
import {KeyChain} from '../../@core/keys/keychain'
import {toRawKey} from '../../@core/keys/util'

export default class ConfigKeys extends Command {
  static override args = {
    operation: Args.string({description: 'operation to perform on keys', options: ['generate']}),
  }
  static override aliases: string[] = ['keys']
  static override description = 'describe the command here'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    raw: Flags.boolean({description: 'output raw key without any formatting'}),
    passphrase: Flags.string({char: 'p', description: 'passphrase to encrypt the key'}),
    recovery: Flags.string({char: 'r', description: 'recovery phrase to recover the key'}),
    words: Flags.integer({char: 'w', description: 'number of words for recovery phrase', default: 24}),
  }

  public async generate(passphrase: string, recovery: string = '', words: number, raw: boolean = false): Promise<void> {
    const keyChain = new KeyChain()
    const recoveryPhrase = recovery || (await keyChain.generateRecoveryPhrase(words))

    this.log("here's your recovery phrase (please store this safely):")
    this.log(recoveryPhrase)

    const masterKey = await keyChain.generateMasterKey(passphrase, recoveryPhrase)
    this.log("here's your master key (you can store this safely):")

    if (raw) {
      this.log('-----BEGIN MASTER KEY-----')
      this.log(toRawKey(masterKey).toString('hex'))
      this.log('-----END MASTER KEY-----')
      return
    }

    this.log(masterKey)
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ConfigKeys)

    switch (args.operation) {
      case 'generate':
        await this.generate(flags.passphrase ?? '', flags.recovery, flags.words, flags.raw)
        break
      default:
        this.error('Invalid operation. Available operations: generate')
    }
  }
}
