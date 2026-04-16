import {FlexibleWorkflowConfig} from '../@types/pipeline.types'
import {Hooks, ProjectConfig, ProjectContext} from './runner.types'

export type PluginFactory = (ctx: ProjectContext) => Hooks
export type PluginInput = Hooks | PluginFactory | (new (ctx: ProjectContext) => Hooks)

export const loadUserPlugins = (context: ProjectContext, container: PluginContainer) => {
  const mod = require(context.package)

  if (typeof mod.plugins === 'function') {
    mod.plugins(container)
  }
}

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
    return this.factories.map((f) => f(context))
  }
}
