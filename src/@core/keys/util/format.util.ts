import {BinaryToTextEncoding} from 'crypto'
import {HKDF_IV_LENGTH, MAX_KEY_LENGTH, MIN_KEY_LENGTH} from '../constants'

/**
 *  Decode a key string into its components from any supported encoding
 *  @param string either with or without salt (v1:hkdf-sha256:s0clEaLJ178ROhL822Yx1hRrKZc2WEc672T6ePnku3dsu-ZMRnml_ZCTbCVHAZ-IMJOV5y4tRGdtP4qdHOebiw)
 *  @param encoding {'base58' | 'base64' | 'base64url' | 'hex'} the encoding used in the provided string (default: base64url)
 *  @param digest {'base58' | 'base64' | 'base64url' | 'hex'} the encoding to use for the returned salt and key (default: base64url)
 *  @returns
 */
export const decodeString = (
  string: string,
  encoding: 'base58' | 'base64' | 'base64url' | 'hex' = 'base64url',
  digest: 'base58' | 'base64' | 'base64url' | 'hex' = 'base64url',
) => {
  const parts = string.split(':')
  if (parts.length < 3 || parts[0][0] !== 'v') {
    throw new Error('invalid key format')
  }

  const v = parseInt(string.slice(1))
  const alg = parts[1]
  const raw = Buffer.from(parts[2], encoding as BufferEncoding)

  if (raw.length >= MIN_KEY_LENGTH && raw.length <= MAX_KEY_LENGTH) {
    return {v, alg, salt: '', key: raw.toString(digest as BinaryToTextEncoding)}
  }

  const salt = raw.subarray(0, HKDF_IV_LENGTH).toString(digest as BinaryToTextEncoding)
  const key = raw.subarray(HKDF_IV_LENGTH).toString(digest as BinaryToTextEncoding)

  return {v, alg, salt: salt, key}
}
