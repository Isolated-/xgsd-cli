import {KEY_DEFAULT_OPTS, MAX_KEY_LENGTH} from './constants'
import {IKeyStore} from './interfaces'
import {IKeyOpts, PartialKeyOpts} from './interfaces/key-opts.interface'
import {IKey} from './interfaces/key.interface'
import {
  decodeKey,
  deriveKey,
  deriveKeyV1,
  encodeKey,
  generateRecoveryPhrase as generateMnemonic,
  generateMasterKey as generateStandardKey,
  toRawKey,
} from './util'

export class KeyChain implements IKey {
  protected readonly opts: IKeyOpts
  protected mnemonic?: string
  protected _keyBytes?: Buffer

  constructor(opts?: IKeyOpts) {
    this.opts = {...KEY_DEFAULT_OPTS, ...opts}
  }

  setMasterKey(key: string): KeyChain {
    this._keyBytes = Buffer.from(key, 'hex')
    return this
  }

  async isMasterKey(): Promise<boolean> {
    return !!this.mnemonic
  }

  async isInitialised(): Promise<boolean> {
    return false
  }

  async select(version: number, opts?: PartialKeyOpts): Promise<string> {
    const options = {...this.opts, ...opts}
    const path = `${version}:${options.type}:${options.context}`

    if (!this._keyBytes) {
      throw new Error('key is not initialised')
    }

    const derived = deriveKey(this._keyBytes, path)
    this._keyBytes = undefined

    return derived
  }

  async generateRecoveryPhrase(words: number = 24, delim: string = '-'): Promise<string> {
    // words should equal to entropy in bits i.e words 12 = 128 bits
    const bits = (words / 3) * 32
    return generateMnemonic(bits).split(' ').join(delim)
  }

  async generateMasterKey(passphrase: string, mnemonic: string, delim: string = '-'): Promise<string> {
    const masterKey = await generateStandardKey(passphrase, mnemonic.split(delim).join(' '), {alg: 'argon2'})
    return Buffer.from(masterKey).toString('hex')
  }
}
