import {Hooks, ProjectContext, Block} from './runner.types'

type PluginFactory = (ctx: ProjectContext) => Hooks
type PluginInput = Hooks | PluginFactory | (new (ctx: ProjectContext) => Hooks)

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

  async projectStart(context: ProjectContext): Promise<void> {
    await Promise.all(this._hooks.map((h) => h.projectStart(context)))
  }

  async projectEnd(context: ProjectContext): Promise<void> {
    //await Promise.all(this._hooks.map((h) => h.projectEnd(context)))
  }

  async blockStart(context: ProjectContext, block: Block): Promise<void> {}

  async blockEnd(context: ProjectContext, block: Block): Promise<void> {}
}
