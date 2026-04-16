import {RetryAttempt} from '../@shared/runner/retry.runner'
import {Hooks, ProjectContext, Block} from './runner.types'

export class PluginManager implements Hooks {
  constructor(private readonly _hooks: Hooks[]) {}

  // lifecycle
  async onMessage(event: any, context: ProjectContext): Promise<void> {
    for (const hook of this._hooks) {
      if (!hook.onMessage) continue
      await hook.onMessage(event.log, context)
    }
  }

  private async invoke<K extends keyof Hooks>(
    fn: K,
    context: ProjectContext,
    block?: Block,
    attempt?: RetryAttempt,
  ): Promise<void> {
    for (const hook of this._hooks) {
      const method = hook[fn]
      if (!method) continue

      try {
        await (method as any)(context, block, attempt)
      } catch (error) {
        // TODO: handle this error
        // for now just silently skip any failing plugins
      }
    }
  }

  async projectStart(context: ProjectContext): Promise<void> {
    return this.invoke('projectStart', context)
  }

  async projectEnd(context: ProjectContext): Promise<void> {
    return this.invoke('projectEnd', context)
  }

  async blockStart(context: ProjectContext, block: Block): Promise<void> {
    return this.invoke('blockStart', context, block)
  }

  async blockEnd(context: ProjectContext, block: Block): Promise<void> {
    return this.invoke('blockEnd', context, block)
  }

  async blockRetry(context: ProjectContext, block: Block, attempt: RetryAttempt): Promise<void> {
    return this.invoke('blockRetry', context, block, attempt)
  }

  async blockWait(context: ProjectContext, block: Block): Promise<void> {
    return this.invoke('blockWait', context, block)
  }

  async blockSkip(context: ProjectContext, block: Block): Promise<void> {
    return this.invoke('blockSkip', context, block)
  }
}
