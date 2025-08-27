import {BinaryToTextEncoding} from 'crypto'
import {IKeyOpts} from './key-opts.interface'

export interface IKey {
  /**
   * Check if the key is a master key. Master keys are only returned once (during import/generation)
   * Then they are lost forever. User will need to re-import the key to access it again.
   * @returns {boolean}
   */
  isMasterKey(): Promise<boolean> | boolean

  /**
   * Check if the key is initialised. Initialised keys are ready for use and have all required
   * information (e.g. key material, metadata) available. The key must be stored before it's
   * considered "initialised"
   * @returns {boolean}
   */
  isInitialised(): Promise<boolean> | boolean

  /**
   * Select/derive a key based on the provided version and options.
   * @param version The version of the key to select. (nothing to do with key versioning, just a parameter)
   * @param opts Additional options for key selection.
   */
  select(version: number, opts?: IKeyOpts): Promise<Buffer | null>

  generateRecoveryPhrase(passphrase?: string): Promise<string>
  generateMasterKey(passphrase?: string): Promise<IKey>
}
