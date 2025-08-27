import {IKeyOpts} from './key-opts.interface'
import {IKey} from './key.interface'

export interface IKeyStore {
  load(opts?: IKeyOpts): Promise<IKey>
  save(key: string, opts?: IKeyOpts): Promise<void>
  exists(opts?: IKeyOpts): Promise<boolean>
  delete(opts?: IKeyOpts): Promise<void>
}
