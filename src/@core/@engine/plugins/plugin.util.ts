import {Hooks} from '../types/hooks.types'
import {Block} from '../types/block.types'
import {ProjectContext} from '../types/project.types'
import {RetryAttempt} from '../types/retry.types'

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

export type InvokeFn = keyof typeof INVOKE_ARGS

export const invoke = async (
  hooks: Hooks[],
  fn: InvokeFn,
  context: ProjectContext,
  block?: Block,
  attempt?: RetryAttempt,
): Promise<void> => {
  for (const hook of hooks) {
    const method = hook[fn]

    if (typeof method !== 'function') continue

    try {
      const args = INVOKE_ARGS[fn](context, block, attempt)
      await (method as any).call(hook, ...args)
    } catch (error) {}
  }
}
