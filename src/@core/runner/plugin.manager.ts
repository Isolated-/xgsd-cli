import {RetryAttempt} from '../@shared/runner/retry.runner'
import {Hooks, ProjectContext, Block} from './runner.types'

const ctxOnly = (ctx: ProjectContext) => [ctx]
const ctxBlock = (ctx: ProjectContext, block?: Block) => [ctx, block]

const INVOKE_ARGS = {
  projectStart: ctxOnly,
  projectEnd: ctxOnly,

  blockStart: ctxBlock,
  blockEnd: ctxBlock,
  blockWait: ctxBlock,
  blockSkip: ctxBlock,

  blockRetry: (ctx: ProjectContext, block?: Block, attempt?: RetryAttempt) => [ctx, block, attempt],
} as const

type InvokeFn = keyof typeof INVOKE_ARGS

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
    for (const hook of this._hooks) {
      const method = hook[fn]
      if (typeof method !== 'function') continue

      try {
        const args = INVOKE_ARGS[fn](context, block, attempt)
        await (method as any).call(hook, ...args)
      } catch (error) {
        // handle error
      }
    }
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
