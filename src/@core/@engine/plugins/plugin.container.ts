import {WorkflowContext} from '../context.builder'
import {PluginFactory, PluginInput} from '../types/factory.types'
import {Hooks} from '../types/hooks.types'
import {Registry} from '../types/interfaces/registry.interface'
import {ProjectConfig, ProjectContext} from '../types/project.types'
import {buildFactories, resolveFactory} from '../util'

export class PluginRegistry implements Registry<PluginInput, Hooks[]> {
  public readonly config: ProjectConfig

  constructor(context: ProjectContext) {
    this.config = context.config
  }

  private factories: ((ctx: ProjectContext) => Hooks)[] = []

  use(input: PluginInput) {
    this.factories.push(resolveFactory(input))
  }

  build(ctx: WorkflowContext<unknown>): Hooks[] {
    return buildFactories(this.factories, ctx)
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
