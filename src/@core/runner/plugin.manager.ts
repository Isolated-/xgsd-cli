import {Hooks, ProjectContext, Block} from './runner.types'

export type PluginFactory = (ctx: ProjectContext) => Hooks
export type PluginInput = Hooks | PluginFactory | (new (ctx: ProjectContext) => Hooks)

export const loadUserPlugins = (context: ProjectContext, container: PluginContainer) => {
  const mod = require(context.package)

  if (typeof mod.plugins === 'function') {
    mod.plugins(container)
  }
}

export class PluginContainer {
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

export class PluginManager implements Hooks {
  constructor(private readonly _hooks: Hooks[]) {}

  // lifecycle
  async onMessage(event: any, context: ProjectContext): Promise<void> {
    for (const hook of this._hooks) {
      if (!hook.onMessage) continue

      await hook.onMessage(event, context)
    }
  }

  async projectStart(context: ProjectContext): Promise<void> {
    for (const hook of this._hooks) {
      if (!hook.projectStart) continue

      await hook.projectStart(context)
    }
  }

  async projectEnd(context: ProjectContext): Promise<void> {
    for (const hook of this._hooks) {
      if (!hook.projectEnd) continue

      await hook.projectEnd(context)
    }
  }

  async blockStart(context: ProjectContext, block: Block): Promise<void> {
    for (const hook of this._hooks) {
      if (!hook.blockStart) continue

      await hook.blockStart(context, block)
    }
  }

  async blockEnd(context: ProjectContext, block: Block): Promise<void> {
    for (const hook of this._hooks) {
      if (!hook.blockEnd) continue
      await hook.blockEnd(context, block)
    }
  }
}
