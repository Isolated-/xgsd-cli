import {Hooks} from '../types/hooks.types'
import {Block} from '../types/block.types'
import {ProjectContext} from '../types/project.types'
import {invoke, InvokeFn} from './plugin.util'
import {RetryAttempt} from '../types/retry.types'
import {BlockEvent, ProjectEvent} from '../types/events.types'

export class PluginManager {
  constructor(private readonly _hooks: Hooks[]) {}

  async emit(event: InvokeFn, ...args: any[]): Promise<void> {
    return invoke(this._hooks, event, args[0], args[1], args[2])
  }
}
