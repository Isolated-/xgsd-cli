import {IKeyOpts} from './key-opts.interface'
import {IKey} from './key.interface'

export interface IKeyStore {
  load(context: string, opts?: IKeyOpts): Promise<IKey>
  save(key: IKey, opts?: IKeyOpts): Promise<void>
  exists(opts?: IKeyOpts): Promise<boolean>
  delete(opts?: IKeyOpts): Promise<void>
}
