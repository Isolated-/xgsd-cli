import {WorkflowContext} from './context.builder'
import {InProcessExecutor} from './executors/in-process.executor'
import {ProcessExecutor} from './executors/process.executor'
import {PluginContainer, PluginManager} from './plugins'
import {PluginInput} from './plugins/plugin.types'
import {Executor} from './types/interfaces/executor.interface'
import {ProjectContext} from './types/project.types'

export const resolveExecutor = (input: ExecutorInput) => {
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

export const loadUserSetup = async (context: ProjectContext, setup: SetupContainer) => {
  const userModule = await import(context.package)

  if (typeof userModule.setup === 'function') {
    await userModule.setup(setup)
  }
}

export type UserSetupFn = (ctx: WorkflowContext, setup: SetupContainer) => Promise<void>

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

export type Factory<T> = (ctx: ProjectContext) => T
export type FactoryInput<T> = T | Factory<T> | (new (ctx: ProjectContext) => T)

export type ExecutorFactory = (ctx: ProjectContext) => Executor
export type ExecutorInput = Executor | ExecutorFactory | (new (ctx: ProjectContext) => Executor)

export class SetupContainer {
  private pluginContainer: PluginContainer
  private executorFactory?: (ctx: ProjectContext) => Executor

  constructor(context: ProjectContext) {
    this.pluginContainer = new PluginContainer(context)
  }

  use(plugin: PluginInput) {
    this.pluginContainer.use(plugin)
  }

  executor(input: ExecutorInput) {
    this.executorFactory = resolveExecutor(input)
  }

  build(context: ProjectContext) {
    const defaultExecutor = context.config.lite ? new InProcessExecutor() : new ProcessExecutor()

    return {
      pluginManager: new PluginManager(this.pluginContainer.createHooks(context)),
      executor: this.executorFactory ? this.executorFactory(context) : defaultExecutor,
    }
  }
}
