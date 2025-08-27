import {BinaryToTextEncoding, randomBytes, hkdfSync} from 'crypto'
import {HKDF_IV_LENGTH, KEY_DEFAULT_OPTS, MIN_KEY_LENGTH, MAX_KEY_LENGTH} from './constants'
import {IKeyOpts, PartialKeyOpts} from './interfaces/key-opts.interface'

export const decodeKey = (
  key: string,
  digest: BinaryToTextEncoding = 'base64url',
): {v: number; alg: string; salt: string; key: string; payload: Record<string, unknown>} => {
  const parts = key.split(':')
  if (parts.length < 3 || parts[0][0] !== 'v') {
    throw new Error('invalid key format')
  }

  if (parts[1] !== 'hkdf-sha256') {
    throw new Error('unsupported key algorithm')
  }

  const raw = Buffer.from(parts[2], digest)
  const iv = raw.subarray(0, HKDF_IV_LENGTH)
  const keyBytes = raw.subarray(HKDF_IV_LENGTH)

  const payload = parts[3] ? JSON.parse(Buffer.from(parts[3], digest).toString('utf-8')) : {}

  if (!isValidLength(keyBytes, {length: payload.length})) {
    throw new Error('key length does not match payload length, possible corruption')
  }

  return {
    v: parseInt(parts[0].slice(1)),
    alg: parts[1],
    salt: iv.toString(digest),
    key: keyBytes.toString(digest),
    payload,
  }
}

export const encodeKey = (key: Buffer, iv: Buffer, opts?: Partial<IKeyOpts>): string => {
  const options = {...KEY_DEFAULT_OPTS, ...opts}
  if (!isValidLength(key, options)) {
    throw new Error(`key length is invalid, expected ${options.length}, provided: ${key.length}`)
  }

  const payload = Buffer.from(
    JSON.stringify({length: options.length, type: options.type, ...options.payload, context: options.context}),
    'utf-8',
  ).toString(options.digest)
  const final = Buffer.concat([iv, key])

  return `v${opts?.version}:hkdf-sha256:${final.toString(options.digest)}:${payload}` // e.g. v1:iv+key
}

/**
 *  Derive a key from the provided key using HKDF
 *  Uses type, context, version to create a unique key for each use case
 *  Internally uses SHA256 as the hash function and a random 8 byte salt
 *  @param from
 *  @param opts
 *  @returns {string} The derived key in the format iv:key (both base64url encoded, or by opts.digest)
 */
export const deriveKeyV1 = (from: Buffer, opts?: PartialKeyOpts): string => {
  const options = {...KEY_DEFAULT_OPTS, ...opts}
  const invalid = `key length is invalid, min: ${MIN_KEY_LENGTH}, max: ${MAX_KEY_LENGTH}, provided: `

  if (!isValidLength(from)) {
    throw new Error(invalid + from.length)
  }

  const iv = randomBytes(HKDF_IV_LENGTH)
  const info = Buffer.from(`${options.type}:${options.context}:${options.version}`)
  const length = options.length
  const key = Buffer.from(hkdfSync('sha256', from, iv, info, length))

  if (!isValidLength(key)) {
    throw new Error('derivation ' + invalid + key.length)
  }

  return encodeKey(key, iv, options)
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
