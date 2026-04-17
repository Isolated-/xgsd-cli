import {Hooks} from '../types/hooks.types'
import {invoke, InvokeFn} from './plugin.util'

export class PluginManager {
  constructor(private readonly _hooks: Hooks[]) {}

  async emit(event: InvokeFn, ...args: any[]): Promise<void> {
    return invoke(this._hooks, event, args[0], args[1], args[2])
  }
}
