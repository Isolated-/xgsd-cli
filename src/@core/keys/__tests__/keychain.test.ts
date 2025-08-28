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
})
