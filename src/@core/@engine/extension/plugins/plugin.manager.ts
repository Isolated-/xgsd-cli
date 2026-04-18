import {BaseManager} from '../../types/generics/manager.interface'
import {Hooks} from '../../types/hooks.types'

export class PluginManager extends BaseManager<any> {
  constructor(plugins: Hooks[]) {
    super(plugins)
  }
}
