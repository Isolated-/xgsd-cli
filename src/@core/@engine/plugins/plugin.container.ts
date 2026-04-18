import {PluginFactory, PluginInput} from '../types/factory.types'
import {Hooks} from '../types/hooks.types'
import {ProjectConfig, ProjectContext} from '../types/project.types'
import {resolveFactory} from '../util'

export class PluginContainer {
  public readonly config: ProjectConfig

  constructor(context: ProjectContext) {
    this.config = context.config
  }

  private factories: ((ctx: ProjectContext) => Hooks)[] = []

  use(input: PluginInput) {
    this.factories.push(resolveFactory(input))
  }

  createHooks(context: ProjectContext): Hooks[] {
    // this fixes user errors like:
    // xgsd.use((ctx) => {}) (no returns)
    // by dropping the plugin before its registered
    return this.factories
      .map((f) => {
        try {
          return f(context)
        } catch {
          return undefined
        }
      })
      .filter((hook): hook is Hooks => !!hook)
  }
}
