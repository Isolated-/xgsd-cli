import {BinaryToTextEncoding} from 'crypto'

export type KeyType = 'derivation' | 'encryption' | 'signing' | 'hmac' | 'master'

export interface IKeyOpts {
  /**
   * The type of key to select
   * @default "encryption"
   */
  type: KeyType

  /**
   * The algorithm to use for the key (defaults to "hkdf-sha256")
   * @default "hkdf-sha256"
   */
  alg: string

  /**
   *  The length of the key (defaults to 64)
   */
  length: number

  /**
   * The context in which the key is used (defaults to "default")
   * @default "default"
   */
  context: string

  /**
   *  The version of the key to select (defaults to 1)
   *  @default 1
   */
  version: number

  /**
   * Additional payload to store with the key (will be encoded in the key string)
   */
  payload?: Record<string, unknown>

  /**
   * The digest algorithm to use for the key (defaults to "sha256")
   * @default "sha256"
   */
  digest?: BinaryToTextEncoding

  [key: string]: unknown
}

export type PartialKeyOpts = Partial<IKeyOpts>
