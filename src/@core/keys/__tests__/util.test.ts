import {BinaryToTextEncoding} from 'crypto'
import {decodeKey, deriveKeyV1, encodeKey, generateMasterKey, generateRecoveryPhrase, isValidLength} from '../util'
import {MAX_KEY_LENGTH} from '../constants'

const key =
  'v1:hkdf-sha256:W2rOiql2RsjrngeCX8ATeKgiumA0wbKIXqYVezA_u_4M5rfiOG5d149nCc_gKMzHllOM1z-7AokHT5OqXQbWwgrQzolrOjDB:eyJsZW5ndGgiOjY0LCJ0eXBlIjoiZGVyaXZhdGlvbiIsImNvbnRleHQiOiJkZWZhdWx0In0'

const decoded = {
  v: 1,
  alg: 'hkdf-sha256',
  salt: 'W2rOiql2Rsg',
  key: '654Hgl_AE3ioIrpgNMGyiF6mFXswP7v-DOa34jhuXdePZwnP4CjMx5ZTjNc_uwKJB0-Tql0G1sIK0M6JazowwQ',
  payload: {length: 64, type: 'derivation', context: 'default'},
}

describe('(util) generateRecoveryPhrase function', () => {
  test('should generate a mnemonic of the correct strength', async () => {
    const mnemonic = generateRecoveryPhrase(256)
    expect(mnemonic.split(' ').length).toBe(24) // 256 bits = 24 words
  })

  test('should generate a mnemonic with custom strength', async () => {
    const mnemonic = generateRecoveryPhrase(128)
    expect(mnemonic.split(' ').length).toBe(12) // 128 bits = 12 words
  })

  test('should generate a mnemonic with default strength', async () => {
    const mnemonic = generateRecoveryPhrase()
    expect(mnemonic.split(' ').length).toBe(24) // default is 256 bits = 24 words
  })
})

describe('(util) generateMasterKey function', () => {
  test('should generate a master key of the correct length (pbdf2)', async () => {
    const passphrase = 'a-strong-passphrase'
    const mnemonic = generateRecoveryPhrase(128)
    const masterKey = await generateMasterKey(passphrase, mnemonic)
    expect(masterKey).toHaveLength(MAX_KEY_LENGTH)
  })

  test('should generate a master key of the correct length (argon2)', async () => {
    const passphrase = 'a-strong-passphrase'
    const mnemonic = generateRecoveryPhrase(128)
    const masterKey = await generateMasterKey(passphrase, mnemonic, {alg: 'argon2'})
    expect(masterKey).toHaveLength(MAX_KEY_LENGTH)
  })

  test('should throw an error if the passphrase is too weak', async () => {
    const passphrase = 'weak'
    const mnemonic = generateRecoveryPhrase(128)
    await expect(generateMasterKey(passphrase, mnemonic)).rejects.toThrow('passphrase is too weak')
  })

  test('should throw an error if the mnemonic is too short', async () => {
    const passphrase = 'a-strong-passphrase'
    const mnemonic = 'too short mnemonic'
    await expect(generateMasterKey(passphrase, mnemonic)).rejects.toThrow('mnemonic must contain 12+ words')
  })
})

describe('(util) deriveKeyV1 tests', () => {
  test('should derive a key of the correct length and format', () => {
    const baseKey = Buffer.from(decoded.key, 'base64url')
    const derivedKey = decodeKey(deriveKeyV1(baseKey, {length: 48, type: 'encryption', context: 'unit-test'}))

    expect(derivedKey.v).toEqual(1)
    expect(derivedKey.alg).toEqual('hkdf-sha256')
    expect(Buffer.from(derivedKey.key, 'base64url')).toHaveLength(48)
    expect(Buffer.from(derivedKey.salt, 'base64url')).toHaveLength(8)
    expect(derivedKey.payload).toEqual({length: 48, type: 'encryption', context: 'unit-test'})
  })

  test('should throw an error if the base key length is invalid', () => {
    expect(() => deriveKeyV1(Buffer.from('shortkey'))).toThrow('key length is invalid, min: 32, max: 64, provided: 8')
  })

  test('should throw an error if the derived key length is invalid', () => {
    const baseKey = Buffer.from(decoded.key, 'base64url')
    expect(() => deriveKeyV1(baseKey, {length: 20})).toThrow(
      'derivation key length is invalid, min: 32, max: 64, provided: 20',
    )
  })
})

describe('(util) isValidLength function', () => {
  test('should validate length correctly', () => {
    expect(isValidLength(32)).toBe(true)
    expect(isValidLength(64)).toBe(true)
    expect(isValidLength(16)).toBe(false)
    expect(isValidLength(128)).toBe(false)
    expect(isValidLength(Buffer.alloc(32))).toBe(true)
    expect(isValidLength(Buffer.alloc(64))).toBe(true)
    expect(isValidLength(Buffer.alloc(16))).toBe(false)
    expect(isValidLength(Buffer.alloc(128))).toBe(false)
    expect(isValidLength('a'.repeat(32), {digest: 'hex'})).toBe(true)
    expect(isValidLength('a'.repeat(64), {digest: 'hex'})).toBe(true)
  })
})

describe('(util) decodeKey function', () => {
  test('should decode the key correctly', () => {
    expect(decodeKey(key)).toEqual(decoded)
  })

  test('should throw an error if the key is missing version prefix', () => {
    const badKey = key.replace('v1:', '')
    expect(() => decodeKey(badKey)).toThrow('invalid key format')
  })

  test('should throw an error if key length is invalid', () => {
    const badKey = key.replace(
      'W2rOiql2RsjrngeCX8ATeKgiumA0wbKIXqYVezA_u_4M5rfiOG5d149nCc_gKMzHllOM1z-7AokHT5OqXQbWwgrQzolrOjDB',
      'shortkey',
    )

    expect(() => decodeKey(badKey)).toThrow('key length does not match payload length, possible corruption')
  })

  test('should decode without payload', () => {
    const noPayloadKey =
      'v1:hkdf-sha256:W2rOiql2RsjrngeCX8ATeKgiumA0wbKIXqYVezA_u_4M5rfiOG5d149nCc_gKMzHllOM1z-7AokHT5OqXQbWwgrQzolrOjDB'
    const decodedNoPayload = decodeKey(noPayloadKey)
    expect(decodedNoPayload.v).toEqual(1)
    expect(decodedNoPayload.alg).toEqual('hkdf-sha256')
    expect(decodedNoPayload.salt).toEqual('W2rOiql2Rsg')
    expect(decodedNoPayload.key).toEqual(
      '654Hgl_AE3ioIrpgNMGyiF6mFXswP7v-DOa34jhuXdePZwnP4CjMx5ZTjNc_uwKJB0-Tql0G1sIK0M6JazowwQ',
    )
    expect(decodedNoPayload.payload).toEqual({})
  })
})

describe('(util) encodeKey function with custom digest', () => {
  const encode = {
    v: 1,
    alg: 'hkdf-sha256',
    salt: 'W2rOiql2Rsg',
    key: '654Hgl_AE3ioIrpgNMGyiF6mFXswP7v-DOa34jhuXdePZwnP4CjMx5ZTjNc_uwKJB0-Tql0G1sIK0M6JazowwQ',
    payload: {length: 64, type: 'derivation', context: 'default'},
  }

  test('should encode the key correctly', () => {
    const encoded = encodeKey(Buffer.from(encode.key, 'base64url'), Buffer.from(encode.salt, 'base64url'), {
      length: 64,
      type: 'derivation',
      context: 'default',
      version: 1,
    })

    expect(encoded).toEqual(key)
  })

  test('should throw an error if the key length is invalid', () => {
    expect(() =>
      encodeKey(Buffer.from(encode.key, 'base64url').subarray(8), Buffer.from(encode.salt, 'base64url'), {
        length: 32,
        type: 'derivation',
        context: 'default',
        version: 1,
      }),
    ).toThrow('key length is invalid, expected 32, provided: 56')
  })

  test('should use the provided digest', () => {
    const customDigest = 'base64' as BinaryToTextEncoding
    const customEncoded = encodeKey(Buffer.from(encode.key, 'base64url'), Buffer.from(encode.salt, 'base64url'), {
      length: 64,
      type: 'derivation',
      context: 'default',
      version: 1,
      digest: customDigest,
    })
    const parts = customEncoded.split(':')

    expect(parts[1]).toEqual('hkdf-sha256')
    expect(parts[2]).toEqual(
      Buffer.concat([Buffer.from(encode.salt, 'base64url'), Buffer.from(encode.key, 'base64url')]).toString(
        customDigest,
      ),
    )
    expect(JSON.parse(Buffer.from(parts[3], customDigest).toString('utf-8'))).toEqual(encode.payload)
  })
})
