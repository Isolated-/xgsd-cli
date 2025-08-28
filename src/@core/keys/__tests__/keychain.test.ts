import {hkdfSync} from 'crypto'
import {KeyChain} from '../keychain'
import {encodeKey, toRawKey} from '../util'
import {mnemonicToSeedSync} from 'bip39'

/**
 *  These tests cover the main functionalities of the KeyChain class, including:
 *  - Creating a KeyChain instance from a raw key.
 *  - Creating a KeyChain instance from an import string.
 *  - Creating a KeyChain instance from a recovery phrase.
 *  - Generating the correct master key from a recovery phrase and passphrase.
 *
 *  @version 1.0.0
 *  @note Once deployed, these tests should not be modified to ensure the integrity of the key generation process.
 *  @note New versions of KeyChain must not break these tests. No modifications to existing tests are allowed. (once deployed)
 *  @note These tests *must* have 100% code coverage.
 *  @note These tests do not need to cover every case -> just contract tests + sane additions.
 */

export const testKeyConfig = {
  version: 1,
  key: '018dc02675ec23a024ca5e563a13edf3612b5fc7155f67d0340af456b82368b74b7a135cfd9f41335754a19b0c365f74dd57a082eb7d889ecb1d220d3a6ad9f6',
  importString: 'v1:hkdf-sha256:AY3AJnXsI6Akyl5WOhPt82ErX8cVX2fQNAr0VrgjaLdLehNc_Z9BM1dUoZsMNl903Veggut9iJ7LHSINOmrZ9g',
  bytes: Buffer.from(
    '018dc02675ec23a024ca5e563a13edf3612b5fc7155f67d0340af456b82368b74b7a135cfd9f41335754a19b0c365f74dd57a082eb7d889ecb1d220d3a6ad9f6',
    'hex',
  ),
  mnemonic:
    'maze-nest-claw-whip-voyage-attend-syrup-order-curve-ridge-find-cheese-avoid-law-dove-ivory-gap-owner-answer-then-often-sorry-winner-seminar',
  passphrase: 'test-passphrase',
  context: 'test',
  child1: '_tRAyWcdQuxubV4ZVCcLMfhUyqd427SybgVzRRSr2hw',
  child5: '5HX7TaEe86ZTtnCRMtS24iH_PuYrZgS6QIQKetF9K7Q',
}

describe('keychain tests', () => {
  const key = testKeyConfig.key
  const mnemonic = testKeyConfig.mnemonic
  const passphrase = testKeyConfig.passphrase
  const context = testKeyConfig.context
  const bytes = testKeyConfig.bytes
  const importString = testKeyConfig.importString

  describe('construction tests', () => {
    test('should create a KeyChain from raw key', () =>
      expect(() => KeyChain.fromRawKey(Buffer.from(key, 'hex'))).not.toThrow())

    test('should create a KeyChain from import string', () =>
      expect(() => KeyChain.fromImportString(importString)).not.toThrow())

    test('should create a KeyChain from recovery phrase', async () =>
      expect(KeyChain.fromRecoveryPhrase(passphrase, mnemonic)).resolves.toBeInstanceOf(KeyChain))
  })

  describe('zero test', () => {
    test('calling .zero() should empty the key buffer', () => {
      const keyChain = KeyChain.fromRawKey(bytes)
      keyChain.zero()
      expect(() => keyChain.digest('hex')).toThrow('key is not initialised')
    })

    test('repeated calls to .zero() have no effect/throw no error', () => {
      const keyChain = KeyChain.fromRawKey(bytes)
      keyChain.zero()
      expect(() => keyChain.zero()).not.toThrow()
    })
  })

  describe('digest test', () => {
    test('calling .digest() should return the key as a hex string', () => {
      const keyChain = KeyChain.fromRawKey(bytes)
      expect(keyChain.digest('hex')).toBe(key)
    })

    test('calling .digest() with different encodings should work', () => {
      const keyChain = KeyChain.fromRawKey(bytes)
      expect(keyChain.digest('base64')).toBe(Buffer.from(key, 'hex').toString('base64'))
    })

    test('calling .digest() on zeroed keychain should throw error', () => {
      const keyChain = KeyChain.fromRawKey(bytes)
      keyChain.zero()
      expect(() => keyChain.digest('hex')).toThrow('key is not initialised')
    })
  })

  describe('creating from recovery phrase/import string/raw key tests', () => {
    test('creating from recovery phrase should generate the correct master key', async () => {
      const keyChain = await KeyChain.fromRecoveryPhrase(passphrase, mnemonic, {context})
      expect(keyChain.digest('hex')).toBe(key)
    })

    test('creating from import string should generate the correct master key', () => {
      const keyChain = KeyChain.fromImportString(importString)
      expect(keyChain.digest('hex')).toBe(key)
    })

    test('creating from raw key should generate the correct master key', () => {
      const keyChain = KeyChain.fromRawKey(bytes)
      expect(keyChain.digest('hex')).toBe(key)
    })

    test('creating from raw key should throw error when length is invalid', () => {
      expect(() => KeyChain.fromRawKey(Buffer.from('invalid-length-key', 'hex'))).toThrow()
    })
  })

  describe('key selection/derivation', () => {
    test('should derive a child key correctly', async () => {
      const keyChain = KeyChain.fromRawKey(bytes)
      const child = await keyChain.select(1, {context, length: 32})
      expect(child.digest('base64url')).toBe(testKeyConfig.child1)
    })

    test('should derive the 5th child key correctly', async () => {
      const keyChain = KeyChain.fromRawKey(bytes)
      const child = await keyChain.select(5, {context, length: 32})
      expect(child.digest('base64url')).toBe(testKeyConfig.child5)
    })

    test('calling select on zeroed keychain should throw error', () => {
      const keyChain = KeyChain.fromRawKey(bytes)
      keyChain.zero()
      expect(() => keyChain.select(1)).rejects.toThrow('key is not initialised')
    })
  })

  describe('export key tests', () => {
    test('should export key in import string format', () => {
      const keyChain = KeyChain.fromRawKey(bytes)
      expect(keyChain.export()).toBe(importString)
    })

    test('should throw error when key is not initialised', () => {
      const keyChain = KeyChain.fromRawKey(bytes)
      keyChain.zero()
      expect(() => keyChain.export()).toThrow('key is not initialised')
    })
  })

  describe('generating recovery phrase tests', () => {
    test('generating recovery phrase should generate the correct number of words', () => {
      const phrase = KeyChain.generateRecoveryPhrase(12, ' ', '-')
      expect(phrase.split('-').length).toBe(12)
    })

    test('generating recovery phrase with different delimiters should work', () => {
      const phrase = KeyChain.generateRecoveryPhrase(12, ' ', '_')
      expect(phrase.split('_').length).toBe(12)
    })

    test('generating recovery phrase with defaults should work', () => {
      const phrase = KeyChain.generateRecoveryPhrase()
      expect(phrase.split('-').length).toBe(24)
    })
  })
})
