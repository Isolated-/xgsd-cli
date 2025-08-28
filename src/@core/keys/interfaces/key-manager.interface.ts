import {createPrivateKey, createPublicKey, createSign, generateKeyPairSync, sign, verify} from 'crypto'
import {KEY_DEFAULT_OPTS} from '../constants'
import {KeyChain} from '../keychain'
import {OsKeyStore} from '../keystore'
import {IKeyOpts, PartialKeyOpts} from './key-opts.interface'
import {IKeyStore} from './keystore.interface'
import {IKey} from './key.interface'
import {decodeString, encodeString} from '../util/format.util'
import {BinaryExportable, IExportable} from '../../generics/exportable.generic'

export interface IKeyManager {
  sign(data: Buffer | string): Promise<{signature: IExportable<string>}>
  verify(data: Buffer | string, signature: Buffer | string): Promise<boolean>
}

/**
 *  Wraps KeyChain and KeyStore into easy to use manager class
 *  @updated 0.1.0
 *  @since 0.1.0
 */
export class KeyManager implements IKeyManager {
  public options: IKeyOpts

  constructor(options?: IKeyOpts, private readonly _store: IKeyStore = new OsKeyStore()) {
    this.options = {
      ...KEY_DEFAULT_OPTS,
      ...options,
    }
  }

  async store(key: KeyChain): Promise<void> {
    await this._store.save(key, this.options)
  }

  private getPrivateKey(from: IKey, format: 'der' | 'pem' = 'pem'): string {
    const privateKey = createPrivateKey({
      key: Buffer.concat([
        Buffer.from('302e020100300506032b657004220420', 'hex'), // ASN.1 header for Ed25519 private key
        Buffer.from(from.digest('hex'), 'hex'),
      ]),
      format: 'der',
      type: 'pkcs8',
    })

    return privateKey.export({format: format as any, type: 'pkcs8'}).toString(this.options.digest)
  }

  getPublicKey(from: string, format: 'der' | 'pem' = 'pem'): string {
    const publicKey = createPublicKey(from)

    if (format === 'der') {
      return `${publicKey.export({format: 'der', type: 'spki'}).toString(this.options.digest)}`
    }

    return publicKey.export({format: format as any, type: 'spki'}).toString(this.options.digest)
  }

  async sign(data: string): Promise<{signature: IExportable<string>}> {
    if (!(await this._store.exists(this.options))) {
      throw new Error(`key not found in "${this.options.context}" context`)
    }

    const keyChain = (await this._store.load(this.options.context, this.options)) as KeyChain
    const signature = await keyChain.sign(data, 'base64')

    return {
      signature: new BinaryExportable(signature, {v: 1, alg: 'ed25519'}),
    }
  }

  async verify(data: Buffer | string, signature: Buffer | string): Promise<boolean> {
    if (!(await this._store.exists(this.options))) {
      throw new Error(`key not found in "${this.options.context}" context`)
    }

    const keyChain = await this._store.load(this.options.context, this.options)
    const verifyingKey = await keyChain.select(1, {...this.options, length: 32, type: 'signing'})
    const privateKey = this.getPrivateKey(verifyingKey)

    const publicKey = this.getPublicKey(privateKey)

    const decodedSig = decodeString(
      Buffer.isBuffer(signature) ? signature.toString(this.options.digest) : (signature as string),
      'base64url',
    )

    const buf = Buffer.from(decodedSig.key, 'base64url')
    return verify(null, Buffer.isBuffer(data) ? data : Buffer.from(data), publicKey, buf)
  }
}
