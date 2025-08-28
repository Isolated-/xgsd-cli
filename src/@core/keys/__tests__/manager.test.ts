import {KeyManager} from '../interfaces/key-manager.interface'

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

describe('key manager unit tests', () => {
  test('should create a new instance', () => {
    const keyManager = new KeyManager()
    expect(keyManager).toBeInstanceOf(KeyManager)
  })
})
