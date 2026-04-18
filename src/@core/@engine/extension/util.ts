import {WorkflowContext} from '../context.builder'
import {WorkflowError, WorkflowErrorCode} from '../error'
import {SetupContainer} from './setup'
import {Block} from '../types/block.types'
import {ExecutorInput, Factory, FactoryInput, LoggerInput, PluginInput} from '../types/factory.types'
import {Hooks} from '../types/hooks.types'
import {ProjectContext} from '../types/project.types'
import {RetryAttempt} from '../types/retry.types'

export type UserSetupFn = (ctx: WorkflowContext, setup: SetupContainer) => Promise<void>

export async function importUserModule(block: Block, context: ProjectContext) {
  try {
    const action = block.run!
    const fn = await import(context.package)
    return fn[action]
  } catch (error: any) {
    throw new WorkflowError(
      `${context.package} couldn't be loaded. This could mean it wasn't found, or there's an error preventing its load. Check logs for more information. (${error.message})`,
      WorkflowErrorCode.ModuleNotFound,
    )
  }
}

export const resolveFactory = <T = unknown>(input: FactoryInput<T>) => {
  if (typeof input === 'function') {
    return (ctx: ProjectContext) => {
      try {
        return new (input as any)(ctx)
      } catch {
        return (input as any)(ctx)
      }
    }
  }

  return () => input
}

export const buildFactories = <T = unknown>(factories: Factory<T>[], ctx: ProjectContext) => {
  // this fixes user errors like:
  // xgsd.use((ctx) => {}) (no returns)
  // by dropping the plugin before its registered
  return factories
    .map((f) => {
      try {
        return f(ctx)
      } catch {
        return undefined
      }
    })
    .filter((factory): factory is T => !!factory)
}

export const loadUserSetup = async (context: ProjectContext, setup: SetupContainer) => {
  const userModule = await import(context.package)

  if (typeof userModule.setup === 'function') {
    const opts = await userModule.setup(setup)
    return opts
  }
}

/**
 *
 *  @param {WorkflowContext} opts.context
 *  @param {PluginInput[]} opts.plugins
 *  @param {ExecutorInput} opts.executor
 *  @param {SetupContainer} opts.setupContainer
 *  @param {UserSetupFn} opts.userCodeFn
 *  @returns
 */
export const createRuntime = async (opts: {
  context: WorkflowContext
  plugins?: PluginInput[]
  loggers?: LoggerInput[]
  executor?: ExecutorInput
  setupContainer?: SetupContainer
  userCodeFn?: UserSetupFn
}) => {
  const {plugins, loggers, executor, context} = opts
  const setup = opts.setupContainer ?? new SetupContainer()
  const userCodeFn = opts.userCodeFn ?? loadUserSetup

  const settings = await userCodeFn(context, setup)

  plugins?.forEach((plugin) => setup.use(plugin))

  if (!settings?.disableCoreLoggers) {
    loggers?.forEach((logger) => setup.logger(logger))
  }

  if (executor) {
    setup.executor(executor)
  }

  return setup.build(context)
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
