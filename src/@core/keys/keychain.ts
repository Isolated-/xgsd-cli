import {BinaryToTextEncoding, createSign, sign, verify} from 'crypto'
import {KEY_DEFAULT_OPTS, MAX_KEY_LENGTH, MIN_KEY_LENGTH} from './constants'
import {IKeyStore} from './interfaces'
import {IKeyOpts, PartialKeyOpts} from './interfaces/key-opts.interface'
import {IKey} from './interfaces/key.interface'
import {
  createSignPrivateKey,
  createSignPublicKey,
  deriveKey,
  encodeKey,
  generateRecoveryPhrase as generateMnemonic,
  generateMasterKey as generateStandardKey,
} from './util'
import {decodeString} from './util/format.util'
import {BinaryExportable, IExportable} from '../generics/exportable.generic'

export class KeyChain implements IKey {
  protected readonly opts: IKeyOpts
  protected _keyBytes!: Buffer

  private constructor(key: Buffer, opts?: PartialKeyOpts) {
    this.opts = {...KEY_DEFAULT_OPTS, ...opts}

    if (key.length < MIN_KEY_LENGTH || key.length > MAX_KEY_LENGTH) {
      throw new Error(`key length must be between ${MIN_KEY_LENGTH} and ${MAX_KEY_LENGTH} bytes`)
    }

    this._keyBytes = key
  }

  get isReady(): boolean {
    return this._keyBytes && this._keyBytes.length > 0
  }

  public static fromImportString(key: string, opts?: PartialKeyOpts): KeyChain {
    const decoded = decodeString(key)

    const buffer = Buffer.from(decoded.key, opts?.digest || 'base64url')
    return this.fromRawKey(buffer, opts)
  }

  public static fromRawKey(key: Buffer, opts?: PartialKeyOpts): KeyChain {
    return new KeyChain(key, opts)
  }

  public static generateRecoveryPhrase(words: number = 24, from: string = ' ', to: string = '-'): string {
    const bits = (words / 3) * 32
    return generateMnemonic(bits).split(from).join(to)
  }

  public static async fromRecoveryPhrase(
    passphrase: string,
    recoveryPhrase: string,
    opts?: PartialKeyOpts,
  ): Promise<KeyChain> {
    const options = {...KEY_DEFAULT_OPTS, ...opts}
    const masterKey = await generateStandardKey(passphrase, recoveryPhrase.split('-').join(' '))
    return this.fromRawKey(masterKey, options)
  }

  async select(version: number, opts?: PartialKeyOpts): Promise<IKey> {
    const options = {...this.opts, ...opts}
    const path = `${version}:${options.type}:${options.context}`

    if (!this.isReady) {
      throw new Error('key is not initialised')
    }

    const derived = deriveKey(this._keyBytes, path, options.length)

    return KeyChain.fromRawKey(Buffer.from(derived, 'hex'), options)
  }

  async getPublicKey(format?: 'der' | 'pem'): Promise<IExportable<string>> {
    if (!this.isReady) {
      throw new Error('key is not initialised')
    }

    const signKey = await this.select(1, {...this.opts, length: 32, type: 'signing'})
    const publicKey = createSignPublicKey(signKey.digest('hex'), format || 'der', 'hex')
    return new BinaryExportable(publicKey)
  }

  async sign(
    data: string,
    encoding: BufferEncoding = 'base64url',
    digest: BinaryToTextEncoding = 'base64url',
  ): Promise<string> {
    if (!this.isReady) {
      throw new Error('key is not initialised')
    }
    const signingKey = await this.select(1, {...this.opts, length: 32, type: 'signing'})

    // dont change (key is always hex, encoding/digest shouldn't be used here)
    const privateKey = createSignPrivateKey(signingKey.digest('hex'), 'pem', 'hex')
    const signature = sign(null, Buffer.from(data, encoding), privateKey)

    return signature.toString(digest)
  }

  async verify(data: string, signature: string, encoding: BinaryToTextEncoding = 'base64url'): Promise<boolean> {
    if (!this.isReady) {
      throw new Error('key is not initialised')
    }

    // dont change (key is always hex, encoding/digest shouldn't be used here)
    const verifyingKey = await this.select(1, {...this.opts, length: 32, type: 'signing'})
    const privateKey = createSignPrivateKey(verifyingKey.digest('hex'), 'pem', 'hex')

    return verify(null, Buffer.from(data, encoding), privateKey, Buffer.from(signature, encoding))
  }

  zero(): void {
    this._keyBytes = Buffer.alloc(0)
  }

  public export(): string
  public export<T extends 'exportable'>(format: T): IExportable<string>
  public export<T extends 'string'>(format: T): string

  export(format: 'exportable' | 'string' = 'string'): string | IExportable<string> {
    if (!this.isReady) {
      throw new Error('key is not initialised')
    }

    if (format === 'exportable') {
      return new BinaryExportable(this.digest(), this.opts)
    }

    return encodeKey(this._keyBytes, Buffer.alloc(0), this.opts)
  }

  digest(encoding: BinaryToTextEncoding = 'hex'): string {
    if (!this.isReady) {
      throw new Error('key is not initialised')
    }

    return this._keyBytes.toString(encoding)
  }
}
