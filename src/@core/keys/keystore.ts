import {findPassword} from 'keytar'
import {KEY_DEFAULT_OPTS} from './constants'
import {IKeyStore, IKeyOpts, IKey} from './interfaces'

export class OsKeyStore implements IKeyStore {
  protected readonly service: string = 'xgsd'

  async load(opts?: IKeyOpts): Promise<IKey> {
    throw new Error('Not implemented')
  }

  async save(key: string, opts?: IKeyOpts): Promise<void> {
    // save the key
  }

  async exists(opts?: IKeyOpts): Promise<boolean> {
    const path = `${opts?.context ?? KEY_DEFAULT_OPTS.context}`
    return findPassword(path).then((password) => !!password)
  }

  async delete(opts?: IKeyOpts): Promise<void> {
    // Implementation for deleting a key from the OS key store
  }
}
