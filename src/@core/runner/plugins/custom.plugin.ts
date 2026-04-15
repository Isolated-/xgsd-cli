import {PluginManager} from '../plugin.manager'
import {ProjectContext} from '../runner.types'

function loadUserPlugins(context: ProjectContext, manager: PluginManager) {
  const mod = require(context.package)

  if (typeof mod.register === 'function') {
    mod.register(manager)
  }
}

export class CustomPlugin {}
