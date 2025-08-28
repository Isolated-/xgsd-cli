import {randomBytes, hkdfSync} from 'crypto'
import {KEY_DEFAULT_OPTS, MIN_KEY_LENGTH, MAX_KEY_LENGTH, HKDF_IV_LENGTH} from './constants'
import {PartialKeyOpts} from './interfaces'
import {isValidLength, encodeKey} from './util'

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
