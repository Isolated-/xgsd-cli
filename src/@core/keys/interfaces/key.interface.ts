import {BinaryToTextEncoding} from 'crypto'
import {IKeyOpts} from './key-opts.interface'
import {IExportable} from '../../generics/exportable.generic'

export interface IKey {
  /**
   * Select/derive a key based on the provided version and options.
   * @param version The version of the key to select. (nothing to do with key versioning, just a parameter)
   * @param opts Additional options for key selection.
   */
  select(version: number, opts?: IKeyOpts): Promise<IKey>
  digest(encoding?: BinaryToTextEncoding): string
  sign(data: string | Buffer, encoding?: BinaryToTextEncoding): Promise<string>
  verify(data: string | Buffer, signature: string, encoding?: BinaryToTextEncoding): Promise<boolean>
  export(format?: 'string' | 'exportable'): string | IExportable<string>
  zero(): void
}
