import {BinaryExportable} from '../exportable.generic'

export const testKeyConfig = {
  version: 1,
  key: '018dc02675ec23a024ca5e563a13edf3612b5fc7155f67d0340af456b82368b74b7a135cfd9f41335754a19b0c365f74dd57a082eb7d889ecb1d220d3a6ad9f6',
  importString: 'v1:hkdf-sha256:AY3AJnXsI6Akyl5WOhPt82ErX8cVX2fQNAr0VrgjaLdLehNc_Z9BM1dUoZsMNl903Veggut9iJ7LHSINOmrZ9g',
  bytes: Buffer.from(
    '018dc02675ec23a024ca5e563a13edf3612b5fc7155f67d0340af456b82368b74b7a135cfd9f41335754a19b0c365f74dd57a082eb7d889ecb1d220d3a6ad9f6',
    'hex',
  ),
  base64url: 'AY3AJnXsI6Akyl5WOhPt82ErX8cVX2fQNAr0VrgjaLdLehNc_Z9BM1dUoZsMNl903Veggut9iJ7LHSINOmrZ9g',
  mnemonic:
    'maze-nest-claw-whip-voyage-attend-syrup-order-curve-ridge-find-cheese-avoid-law-dove-ivory-gap-owner-answer-then-often-sorry-winner-seminar',
  passphrase: 'test-passphrase',
  context: 'test',
  child1: '_tRAyWcdQuxubV4ZVCcLMfhUyqd427SybgVzRRSr2hw',
  child5: '5HX7TaEe86ZTtnCRMtS24iH_PuYrZgS6QIQKetF9K7Q',
}

describe('exportable unit tests', () => {
  test('should create an instance from import string', () => {
    const exportable = BinaryExportable.parseImportString(testKeyConfig.importString)
    expect(exportable).toBeInstanceOf(BinaryExportable)
    expect(exportable.digest()).toBe(testKeyConfig.base64url)
    expect(exportable.opts).toEqual({v: 1, alg: 'hkdf-sha256'})
  })

  test('should create an instance from raw data', () => {
    const exportable = new BinaryExportable(testKeyConfig.base64url)
    expect(exportable).toBeInstanceOf(BinaryExportable)
    expect(exportable.digest()).toBe(testKeyConfig.base64url)
  })

  test('should return raw data', () => {
    const exportable = new BinaryExportable(testKeyConfig.base64url)
    expect(exportable.raw('base64url')).toEqual(testKeyConfig.bytes)
  })

  test('should return the correct import string', () => {
    const exportable = new BinaryExportable(testKeyConfig.base64url, {v: 1, alg: 'hkdf-sha256'})
    expect(exportable.export()).toBe(testKeyConfig.importString)
  })
})
