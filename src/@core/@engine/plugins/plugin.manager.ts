import {Hooks} from '../types/hooks.types'
import {RetryAttempt} from '../runner/retry.runner'
import {Block} from '../types/block.types'
import {ProjectContext} from '../types/project.types'
import {invoke, InvokeFn} from './plugin.util'

export class PluginManager implements Hooks {
  constructor(private readonly _hooks: Hooks[]) {}

  // lifecycle
  async onMessage(event: any, context: ProjectContext): Promise<void> {
    for (const hook of this._hooks) {
      if (!hook.onMessage) continue
      await hook.onMessage(event.log, context)
    }
  }

  private async invoke(fn: InvokeFn, context: ProjectContext, block?: Block, attempt?: RetryAttempt): Promise<void> {
    return invoke(this._hooks, fn, context, block, attempt)
  }

  async projectStart(context: ProjectContext): Promise<void> {
    await this.invoke('projectStart', context)
  }

  async projectEnd(context: ProjectContext): Promise<void> {
    await this.invoke('projectEnd', context)
  }

  async blockStart(context: ProjectContext, block: Block): Promise<void> {
    await this.invoke('blockStart', context, block)
  }

  async blockEnd(context: ProjectContext, block: Block): Promise<void> {
    await this.invoke('blockEnd', context, block)
  }

  async blockRetry(context: ProjectContext, block: Block, attempt: RetryAttempt): Promise<void> {
    await this.invoke('blockRetry', context, block, attempt)
  }

  async blockWait(context: ProjectContext, block: Block): Promise<void> {
    await this.invoke('blockWait', context, block)
  }

  async blockSkip(context: ProjectContext, block: Block): Promise<void> {
    await this.invoke('blockSkip', context, block)
  }
}
