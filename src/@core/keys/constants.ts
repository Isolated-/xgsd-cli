import {IKeyOpts} from './interfaces/key-opts.interface'

export const MIN_KEY_LENGTH: number = 32
export const MAX_KEY_LENGTH: number = 64
export const DEFAULT_KEY_LENGTH: number = 64

export const MIN_PBKDF2_ITERATIONS = 100000
export const MAX_PBKDF2_ITERATIONS = 10000000
export const DEFAULT_PBKDF2_ITERATIONS = 300000

export const DEFAULT_PHRASE_LENGTH = 256

export const HKDF_IV_LENGTH = 8 // bytes

export const KEY_DEFAULT_OPTS: IKeyOpts = {
  type: 'derivation',
  context: 'default',
  alg: 'hkdf-sha256',
  version: 1,
  digest: 'base64url',
  length: MAX_KEY_LENGTH,
}
