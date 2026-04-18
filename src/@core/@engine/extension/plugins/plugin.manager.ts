import {BaseManager} from '../../types/generics/manager.interface'
import {Hooks} from '../../types/hooks.types'
import {invoke, InvokeFn} from '../../util'

export class PluginManager {
  constructor(private plugins: Hooks[]) {}

  async emit(event: InvokeFn, ...args: any[]): Promise<void> {
    await invoke(this.plugins, event, args[0], args[1], args[2])
  }
}
