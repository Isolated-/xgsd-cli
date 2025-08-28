import {findPassword, setPassword, getPassword, deletePassword} from 'keytar'
import {KEY_DEFAULT_OPTS} from './constants'
import {IKeyStore, IKeyOpts, IKey, PartialKeyOpts} from './interfaces'
import {debug} from '../util/debug.util'
import {KeyChain} from './keychain'

export class OsKeyStore implements IKeyStore {
  public static readonly name = 'OsKeyStore'
  protected readonly service: string = 'xgsd'

  private storagePath(opts: PartialKeyOpts): string {
    const options = {...KEY_DEFAULT_OPTS, ...opts}
    const path = `v1:${options.context}:${options.type}`

    return path
  }

  async load(context: string = 'default', opts?: PartialKeyOpts): Promise<IKey> {
    const options = {...KEY_DEFAULT_OPTS, ...opts}
    const path = this.storagePath({context, type: 'derivation'})

    debug(`(load) loading key from OS keystore ${path}`, OsKeyStore.name)

    const stored = await getPassword(this.service, path)
    if (!stored) {
      throw new Error(`no key found in OS key store at ${path}`)
    }

    debug(`(load) key loaded from OS keystore ${path}`, OsKeyStore.name)
    return KeyChain.fromImportString(stored, options)
  }

  async save(key: IKey, opts?: PartialKeyOpts): Promise<void> {
    const options = {...KEY_DEFAULT_OPTS, ...opts}
    const path = this.storagePath(options)

    debug(`(save) saving key to OS keystore ${path}`, OsKeyStore.name)

    if (await this.exists(options)) {
      debug(`(save) key already exists at ${path}, key will be overwitten.`, OsKeyStore.name)
    }

    await setPassword(this.service, path, key.export())
    debug(`(save) key saved to OS keystore ${path}`, OsKeyStore.name)
  }

  async exists(opts?: IKeyOpts): Promise<boolean> {
    const options = {...KEY_DEFAULT_OPTS, ...opts}

    const path = this.storagePath(options)
    return !!(await getPassword(this.service, path))
  }

  async delete(opts?: IKeyOpts): Promise<void> {
    const options = {...KEY_DEFAULT_OPTS, ...opts}
    const path = this.storagePath(options)

    debug(`(delete) deleting key from OS keystore ${path}`, OsKeyStore.name)

    if (!(await this.exists(options))) {
      debug(`(delete) no key found at ${path}, nothing to delete.`, OsKeyStore.name)
      return
    }

    await deletePassword(this.service, path)
    debug(`(delete) key deleted from OS keystore ${path}`, OsKeyStore.name)
  }
}
