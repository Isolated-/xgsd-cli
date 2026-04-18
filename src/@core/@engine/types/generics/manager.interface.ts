import {invoke, InvokeFn} from '../../extension/util'
import {Hooks} from '../hooks.types'

export interface Manager {
  emit(event: InvokeFn, ...args: any[]): Promise<void>
}

export class BaseManager<T extends Hooks> {
  constructor(private readonly items: T[]) {}

  async emit(event: InvokeFn, ...args: any[]): Promise<void> {
    await invoke(this.items, event, args[0], args[1], args[2])
  }
}
