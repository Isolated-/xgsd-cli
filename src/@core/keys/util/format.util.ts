import {BinaryToTextEncoding} from 'crypto'
import {HKDF_IV_LENGTH, MAX_KEY_LENGTH, MIN_KEY_LENGTH} from '../constants'

/**
 *  Decode a key string into its components from any supported encoding
 *  @param string either with or without salt (v1:hkdf-sha256:s0clEaLJ178ROhL822Yx1hRrKZc2WEc672T6ePnku3dsu-ZMRnml_ZCTbCVHAZ-IMJOV5y4tRGdtP4qdHOebiw)
 *  @param encoding {'base58' | 'base64' | 'base64url' | 'hex'} the encoding used in the provided string (default: base64url)
 *  @param digest {'base58' | 'base64' | 'base64url' | 'hex'} the encoding to use for the returned salt and key (default: base64url)
 *  @returns
 */
export type Decoded = {
  v: number
  alg: string
  salt: string
  key: string
}

export const decodeString = (
  input: string,
  encoding: 'base58' | 'base64' | 'base64url' | 'hex' = 'base64url',
  digest: 'base58' | 'base64' | 'base64url' | 'hex' = 'base64url',
): Decoded => {
  const parts = input.split(':')

  const toBuffer = (val: string) => Buffer.from(val, encoding as BufferEncoding)
  const toString = (buf: Buffer) => buf.toString(digest as BinaryToTextEncoding)

  const validateLength = (buf: Buffer) => {
    if (buf.length < MIN_KEY_LENGTH || buf.length > MAX_KEY_LENGTH) {
      throw new Error('invalid key format')
    }
  }

  // Case 1: raw key only
  if (parts.length === 1) {
    const rawBytes = toBuffer(parts[0])
    validateLength(rawBytes)

    return {v: -1, alg: '', salt: '', key: parts[0]}
  }

  // Case 2: version + key
  if (parts.length === 2) {
    const rawBytes = toBuffer(parts[1])
    validateLength(rawBytes)

    return {v: parseInt(parts[0][1]), alg: '', salt: '', key: parts[1]}
  }

  // Case 3: full format vX:alg:data
  if (parts.length < 3 || parts[0][0] !== 'v') {
    throw new Error('invalid key format')
  }

  const v = parseInt(input.slice(1))
  const alg = parts[1]
  const rawBytes = toBuffer(parts[2])

  if (rawBytes.length >= MIN_KEY_LENGTH && rawBytes.length <= MAX_KEY_LENGTH) {
    return {v, alg, salt: '', key: toString(rawBytes)}
  }

  const salt = toString(rawBytes.subarray(0, HKDF_IV_LENGTH))
  const key = toString(rawBytes.subarray(HKDF_IV_LENGTH))

  validateLength(key.length ? toBuffer(key) : Buffer.alloc(0))

  return {v, alg, salt, key}
}

export const encodeString = (key: string, v?: number, alg?: string) => {
  return [v ? 'v' + v : '', alg, key].filter(Boolean).join(':')
}
