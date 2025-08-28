import {decodeString, encodeString} from '../util/format.util'

const key = 's0clEaLJ178ROhL822Yx1hRrKZc2WEc672T6ePnku3dsu-ZMRnml_ZCTbCVHAZ-IMJOV5y4tRGdtP4qdHOebiw'
const alg = 'hkdf-sha256'
const v = 1
const unSaltedKey = `v${v}:${alg}:${key}`

describe('(format util) encodeString(key, v, alg) function', () => {
  test('should encode the key into a string with version and algorithm', () => {
    expect(encodeString('test-key', 1, 'hkdf-sha256')).toBe('v1:hkdf-sha256:test-key')
  })

  test('should encode string without algorithm', () => {
    expect(encodeString('test-key', 1)).toBe('v1:test-key')
  })

  test('should encode string without version and algorithm', () => {
    expect(encodeString('test-key', undefined, undefined)).toBe('test-key')
  })
})

describe('(format util) decodeString(string) function', () => {
  test('should decode a key in its smallest form', () => {
    expect(decodeString(key)).toEqual({
      v: -1,
      alg: '',
      salt: '',
      key,
    })
  })

  test('should decode a key with only version prefix', () => {
    expect(
      decodeString('v1:s0clEaLJ178ROhL822Yx1hRrKZc2WEc672T6ePnku3dsu-ZMRnml_ZCTbCVHAZ-IMJOV5y4tRGdtP4qdHOebiw'),
    ).toEqual({
      v: 1,
      alg: '',
      salt: '',
      key,
    })
  })

  test('should decode the key into its original components (not salt)', () => {
    expect(decodeString(unSaltedKey)).toEqual({
      v: 1,
      alg: 'hkdf-sha256',
      salt: '',
      key: 's0clEaLJ178ROhL822Yx1hRrKZc2WEc672T6ePnku3dsu-ZMRnml_ZCTbCVHAZ-IMJOV5y4tRGdtP4qdHOebiw',
    })
  })

  test('should decode the key into its original components (with salt)', () => {
    const saltedKey =
      'v1:hkdf-sha256:W2rOiql2RsjrngeCX8ATeKgiumA0wbKIXqYVezA_u_4M5rfiOG5d149nCc_gKMzHllOM1z-7AokHT5OqXQbWwgrQzolrOjDB'
    expect(decodeString(saltedKey)).toEqual({
      v: 1,
      alg: 'hkdf-sha256',
      salt: 'W2rOiql2Rsg',
      key: '654Hgl_AE3ioIrpgNMGyiF6mFXswP7v-DOa34jhuXdePZwnP4CjMx5ZTjNc_uwKJB0-Tql0G1sIK0M6JazowwQ',
    })
  })

  test('should return the decoded object from base64url to hex', () => {
    expect(decodeString(unSaltedKey, 'base64url', 'hex')).toEqual({
      v: 1,
      alg: 'hkdf-sha256',
      salt: '',
      key: 'b3472511a2c9d7bf113a12fcdb6631d6146b29973658473aef64fa78f9e4bb776cbbe64c4679a5fd90936c2547019f88309395e72e2d44676d3f8a9d1ce79b8b',
    })
  })
})
