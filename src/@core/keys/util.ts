import {BinaryToTextEncoding, randomBytes, hkdfSync, pbkdf2Sync, createHash, hkdf} from 'crypto'
import {
  HKDF_IV_LENGTH,
  KEY_DEFAULT_OPTS,
  MIN_KEY_LENGTH,
  MAX_KEY_LENGTH,
  DEFAULT_PHRASE_LENGTH,
  MIN_PBKDF2_ITERATIONS,
  MAX_PBKDF2_ITERATIONS,
  DEFAULT_KEY_LENGTH,
} from './constants'
import {IKeyOpts, PartialKeyOpts} from './interfaces/key-opts.interface'
import {generateMnemonic, mnemonicToEntropy, mnemonicToSeedSync} from 'bip39'

/**
 *  Generate a new mnemonic recovery phrase
 *  @param {number} strength
 *  @returns {string} The generated mnemonic phrase (BIP39 standard, space delimited)
 */
export const generateRecoveryPhrase = (strength: number = DEFAULT_PHRASE_LENGTH): string => {
  return generateMnemonic(strength)
}

export interface MasterKeyOpts {
  length: number
  salt?: Buffer
  hash?: 'sha128' | 'sha256' | 'sha512'
  alg?: 'pbkdf2' | 'argon2' | 'hkdf'
}
export type MasterKeyAdditionalOpts = {[key: string]: any}

export type MasterKeyOptions = Partial<MasterKeyOpts> & MasterKeyAdditionalOpts

export type MasterKeyGenerator = (passphrase: Buffer, seed: Buffer, opts?: MasterKeyOptions) => Promise<Buffer>

export const generateMasterKey = async (
  passphrase: string,
  mnemonic: string,
  opts?: MasterKeyOptions,
  generator?: MasterKeyGenerator,
): Promise<Buffer> => {
  const options: MasterKeyOpts = {
    alg: 'pbkdf2',
    length: MAX_KEY_LENGTH,
    hash: 'sha512',
    ...opts,
  }

  if (!passphrase || passphrase.length < 8) {
    throw new Error('passphrase is too weak')
  }

  if (!mnemonic || mnemonic.split(' ').length < 12) {
    throw new Error('mnemonic must contain 12+ words')
  }

  const passwordBuf = Buffer.from(passphrase, 'utf-8')

  const seed = mnemonicToSeedSync(mnemonic, passphrase)

  if (generator) {
    return generator(passwordBuf, seed, options)
  }

  const hkdf = hkdfSync(options.hash as any, passwordBuf, seed, seed, options.length)
  return Buffer.from(hkdf)
}

export const toRawKey = (key: string): Buffer => {
  const decoded = decodeKey(key)
  return Buffer.from(decoded.key, 'base64url')
}

export const decodeKey = (
  key: string,
  digest: BinaryToTextEncoding = 'base64url',
): {v: number; alg: string; salt: string; key: string} => {
  const parts = key.split(':')
  if (parts.length < 3 || parts[0][0] !== 'v') {
    throw new Error('invalid key format')
  }

  const raw = Buffer.from(parts[2], digest)
  const iv = raw.subarray(0, HKDF_IV_LENGTH)
  const keyBytes = raw.subarray(HKDF_IV_LENGTH)

  if (!isValidLength(keyBytes)) {
    throw new Error('key length does not match payload length, possible corruption')
  }

  return {
    v: parseInt(parts[0].slice(1)),
    alg: parts[1],
    salt: iv.toString(digest),
    key: keyBytes.toString(digest),
  }
}

export const encodeKey = (key: Buffer, iv: Buffer, opts?: Partial<IKeyOpts>): string => {
  const options = {...KEY_DEFAULT_OPTS, ...opts}
  if (!isValidLength(key, options)) {
    throw new Error(`key length is invalid, expected ${options.length}, provided: ${key.length}`)
  }

  const final = Buffer.concat([iv, key])

  return `v${options.version}:${options.alg}:${final.toString(options.digest)}` // e.g. v1:iv+key
}

export const deriveKey = (from: Buffer | string, path: string = '', length: number = MAX_KEY_LENGTH): string => {
  let data = from
  if (typeof data === 'string') {
    data = Buffer.from(from as 'string', 'utf-8')
  }

  if (!isValidLength(data)) {
    throw new Error(`key length is invalid, min: ${MIN_KEY_LENGTH}, max: ${MAX_KEY_LENGTH}, provided: ${data.length}`)
  }

  const key = hkdfSync('sha512', data, Buffer.alloc(0), path, length)
  return Buffer.from(key).toString('hex')
}

/**
 *  Derive a key from the provided key using HKDF
 *  Uses type, context, version to create a unique key for each use case
 *  Internally uses SHA256 as the hash function and a random 8 byte salt
 *  @version 1
 *  @param from
 *  @param opts
 *  @returns {string} The derived key in the format iv:key (both base64url encoded, or by opts.digest)
 */
export const deriveKeyV1 = (from: Buffer, opts?: PartialKeyOpts & {salt?: Buffer}): string => {
  const options = {...KEY_DEFAULT_OPTS, ...opts}
  const invalid = `key length is invalid, min: ${MIN_KEY_LENGTH}, max: ${MAX_KEY_LENGTH}, provided: `

  if (!isValidLength(from)) {
    throw new Error(invalid + from.length)
  }

  const salt = options.salt || randomBytes(HKDF_IV_LENGTH)

  const info = Buffer.from(`${options.type}:${options.context}:${options.version}`)
  const length = options.length
  const key = Buffer.from(hkdfSync('sha256', from, salt, info, length))

  if (!isValidLength(key)) {
    throw new Error('derivation ' + invalid + key.length)
  }

  return encodeKey(key, salt, options)
}

export const isValidLength = (value: Buffer | number | string, opts?: Partial<IKeyOpts>): boolean => {
  let test: number = 0

  if (typeof value === 'number') {
    test = value
  }

  if (typeof value === 'string') {
    test = Buffer.from(value).length
  }

  if (Buffer.isBuffer(value)) {
    test = value.length
  }

  if (opts?.type === 'derivation' && test !== MAX_KEY_LENGTH) {
    return false
  }

  return test >= MIN_KEY_LENGTH && test <= MAX_KEY_LENGTH
}
