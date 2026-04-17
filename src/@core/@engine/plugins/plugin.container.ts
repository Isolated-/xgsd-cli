import {ProcessExecutor} from '../executors/process.executor'
import {Hooks} from '../types/hooks.types'
import {Executor} from '../types/interfaces/executor.interface'
import {ProjectConfig, ProjectContext} from '../types/project.types'
import {PluginInput, PluginFactory} from './plugin.types'

export class PluginContainer {
  public readonly config: ProjectConfig

  constructor(context: ProjectContext) {
    this.config = context.config
  }

  private factories: ((ctx: ProjectContext) => Hooks)[] = []

  use(input: PluginInput) {
    if (typeof input === 'function') {
      this.factories.push((ctx) => {
        try {
          return new (input as any)(ctx)
        } catch {
          return (input as PluginFactory)(ctx)
        }
      })
      return
    }

    this.factories.push(() => input)
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
