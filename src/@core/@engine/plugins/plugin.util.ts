import {Hooks} from '../types/hooks.types'
import {Block} from '../types/block.types'
import {ProjectContext} from '../types/project.types'
import {PluginRegistry} from './plugin.container'
import {PluginManager} from './plugin.manager'
import {RetryAttempt} from '../types/retry.types'
import {SetupContainer} from '../setup'
import {PluginInput} from '../types/factory.types'

export const loadUserPlugins = (context: ProjectContext, container: PluginRegistry) => {
  const mod = require(context.package)

  if (typeof mod.plugins === 'function') {
    mod.plugins(container)
  }
}

export const loadUserSetup = async (context: ProjectContext, setup: SetupContainer) => {
  const userModule = await import(context.package)

  if (typeof userModule.setup === 'function') {
    await userModule.setup(setup)
  }
}

export const createRuntime = async (context: ProjectContext, plugins?: PluginInput[]) => {
  const setup = new SetupContainer(context)

  plugins?.forEach((plugin) => setup.use(plugin))

  await loadUserSetup(context, setup)

  const {pluginManager, executor} = setup.build(context)

  return {pluginManager, executor}
}

export const createPluginManager = (context: ProjectContext, plugins?: PluginInput[]) => {
  const container = new PluginRegistry(context)

  // register plugins
  plugins?.forEach((plugin) => container.use(plugin))

  // user plugins
  //loadUserPlugins(context.format!() as any, container)

  const hooks = container.createHooks(context)

  const manager = new PluginManager(hooks)

  return manager
}

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
