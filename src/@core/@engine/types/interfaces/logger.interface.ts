import {Hooks} from '../hooks.types'

export interface Logger<T = unknown> extends Hooks {
  log(message: T): Promise<void> | void
}
