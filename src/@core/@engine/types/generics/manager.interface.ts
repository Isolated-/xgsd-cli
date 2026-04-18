import {invoke, InvokeFn} from '../../util'
import {Hooks} from '../hooks.types'

export interface Manager {
  emit(event: InvokeFn, ...args: any[]): Promise<void>
}

export abstract class BaseManager<T extends Hooks> {
  constructor(private readonly items: T[]) {}

  async emit(event: InvokeFn, ...args: any[]): Promise<void> {
    await invoke(this.items, event, args[0], args[1], args[2])
  }
}
