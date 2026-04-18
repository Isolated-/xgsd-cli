import {WorkflowContext} from './context.builder'
import {WorkflowError, WorkflowErrorCode} from './error'
import {SetupContainer} from './setup'
import {Block} from './types/block.types'
import {ExecutorInput, Factory, FactoryInput, PluginInput} from './types/factory.types'
import {ProjectContext} from './types/project.types'

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

export const resolveFactory = (input: FactoryInput<unknown>) => {
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
    await userModule.setup(setup)
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
  executor?: ExecutorInput
  setupContainer?: SetupContainer
  userCodeFn?: UserSetupFn
}) => {
  const {plugins, executor, context} = opts
  const setup = opts.setupContainer ?? new SetupContainer(context)
  const userCodeFn = opts.userCodeFn ?? loadUserSetup

  plugins?.forEach((plugin) => setup.use(plugin))

  if (executor) {
    setup.executor(executor)
  }

  await userCodeFn(context, setup)

  return setup.build(context)
}
