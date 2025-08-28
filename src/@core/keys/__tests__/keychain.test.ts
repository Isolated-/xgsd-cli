import {hkdfSync} from 'crypto'
import {KeyChain} from '../keychain'
import {encodeKey, toRawKey} from '../util'
import {mnemonicToSeedSync} from 'bip39'

describe('keychain tests', () => {
  const key =
    'b3472511a2c9d7bf113a12fcdb6631d6146b29973658473aef64fa78f9e4bb776cbbe64c4679a5fd90936c2547019f88309395e72e2d44676d3f8a9d1ce79b8b'

  const mnemonic = 'shoulder-worry-hospital-animal-buffalo-taxi-month-pigeon-market-piece-engage-try'
    .split('-')
    .join(' ')

  test('should create a keychain instance from import string', async () => {
    const importString =
      'v1:hkdf-sha256:s0clEaLJ178ROhL822Yx1hRrKZc2WEc672T6ePnku3dsu-ZMRnml_ZCTbCVHAZ-IMJOV5y4tRGdtP4qdHOebiw'

    expect(KeyChain.fromImportString(importString)).toBeInstanceOf(KeyChain)
    expect(await KeyChain.fromImportString(importString).isInitialised()).toBe(true)
  })

  describe('should generate and recover master keys', () => {
    test('should recover a master key from a recovery phrase', async () => {
      const passphrase = 'passphrase'
      const seed = mnemonicToSeedSync(mnemonic, passphrase)
      const derived = Buffer.from(hkdfSync('sha512', Buffer.from(passphrase), seed, seed, 64))

      expect(derived).toHaveLength(64)
      expect(derived.toString('hex')).toBe(key)

      const keyChain = new KeyChain()
      const recoveredKey = await keyChain.generateMasterKey(passphrase, mnemonic.split(' ').join('-'))
      expect(recoveredKey).toBe(key)
    })
  })

  describe('should select (derive) a key from master', () => {
    test('should derive a child key from master', async () => {
      const keyChain = new KeyChain()
      keyChain.setMasterKey(key)

      const child1 = await keyChain.select(1)
      expect(child1).toBe(
        'e51345b48c514d866d0fd78cb8f1d93d04ae3b0b6a426996f2a789b117f28ba73a4974e80f14408773ab576d35afd9f0d9e7e153bbacb44003f95edc794ac871',
      )
    })
  })
})
