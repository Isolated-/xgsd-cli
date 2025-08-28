import {decodeString} from '../util/format.util'

const unSaltedKey =
  'v1:hkdf-sha256:s0clEaLJ178ROhL822Yx1hRrKZc2WEc672T6ePnku3dsu-ZMRnml_ZCTbCVHAZ-IMJOV5y4tRGdtP4qdHOebiw'

describe('(format util) decodeString(string) function', () => {
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

  test('should throw an error if the key is missing version prefix', () => {
    const badKey = unSaltedKey.replace('v1:', '')
    expect(() => decodeString(badKey)).toThrow('invalid key format')
  })
})
