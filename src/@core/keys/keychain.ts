import {KEY_DEFAULT_OPTS, MAX_KEY_LENGTH} from './constants'
import {IKeyStore} from './interfaces'
import {IKeyOpts, PartialKeyOpts} from './interfaces/key-opts.interface'
import {IKey} from './interfaces/key.interface'
import {
  deriveKey,
  encodeKey,
  generateRecoveryPhrase as generateMnemonic,
  generateMasterKey as generateStandardKey,
} from './util'
import {decodeString} from './util/format.util'

export class KeyChain implements IKey {
  protected readonly opts: IKeyOpts
  protected mnemonic?: string
  protected isMaster?: boolean
  protected _keyBytes?: Buffer

  constructor(opts?: PartialKeyOpts, key?: Buffer) {
    this.opts = {...KEY_DEFAULT_OPTS, ...opts}
    this._keyBytes = key
  }

  public static fromImportString(key: string, opts?: PartialKeyOpts): KeyChain {
    const decoded = decodeString(key)

    const buffer = Buffer.from(decoded.key, opts?.digest || 'base64url')
    return this.fromRawKey(buffer, opts)
  }

  public static fromRawKey(key: Buffer, opts?: PartialKeyOpts): KeyChain {
    return new KeyChain(opts, key)
  }

  setMasterKey(key: string): KeyChain {
    this._keyBytes = Buffer.from(key, 'hex')
    return this
  }

  async isMasterKey(): Promise<boolean> {
    return !!this.isMaster
  }

  async isInitialised(): Promise<boolean> {
    return !!this._keyBytes
  }

  async select(version: number, opts?: PartialKeyOpts): Promise<string> {
    const options = {...this.opts, ...opts}
    const path = `${version}:${options.type}:${options.context}`

    if (!this._keyBytes) {
      throw new Error('key is not initialised')
    }

    const derived = deriveKey(this._keyBytes, path, 64)

    return derived
  }

  export(): string {
    if (!this._keyBytes) {
      throw new Error('key is not initialised')
    }

    return encodeKey(this._keyBytes, Buffer.alloc(0), this.opts)
  }

  async generateRecoveryPhrase(words: number = 24, delim: string = '-'): Promise<string> {
    // words should equal to entropy in bits i.e words 12 = 128 bits
    const bits = (words / 3) * 32
    return generateMnemonic(bits).split(' ').join(delim)
  }

  async generateMasterKey(passphrase: string, mnemonic: string, delim: string = '-'): Promise<string> {
    const masterKey = await generateStandardKey(passphrase, mnemonic.split(delim).join(' '))
    this._keyBytes = masterKey
    this.isMaster = true
    return Buffer.from(masterKey).toString('hex')
  }
}
