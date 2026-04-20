import {WorkflowContext} from '../context.builder'
import {WorkflowError, WorkflowErrorCode} from '../error'
import {SetupContainer} from './setup'
import {Block} from '../types/block.types'
import {ExecutorInput, Factory, FactoryInput, LoggerInput, PluginInput, ReporterInput} from '../types/factory.types'
import {Hooks} from '../types/hooks.types'
import {ProjectContext} from '../types/project.types'
import {RetryAttempt} from '../types/retry.types'
import {EventHandler} from './lifecycle'
import {SystemEvent} from '../types/events.types'
import {EventEmitter2} from 'eventemitter2'
import {PluginRegistry} from './plugins/plugin.registry'
import {LoggerRegistry} from './loggers/logger.registry'
import {Context} from '../../config'
import {EventBus} from '../event'

export type UserSetupFn = (ctx: Context, setup: SetupContainer) => Promise<void>

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

export type Lifecycle = {
  name?: string
  init?: (ctx: any) => Promise<void> | void
  exit?: (ctx: any) => Promise<void> | void
}

type Extension = {
  name?: string
  core?: boolean
  type?: 'plugin' | 'logger' | 'reporter'
  init?: (ctx: any) => Promise<void> | void
  exit?: (ctx: any) => Promise<void> | void
  on?: (e: string, handler: EventHandler) => void
}

export const runInit = async <T extends Extension>(items: T[], ctx: Context, bus?: EventBus<EventEmitter2>) => {
  for (const item of items) {
    if (item.init) {
      await item.init(ctx)
    }

    if (bus) {
      await bus.emit(SystemEvent.ExtensionLoaded, {
        name: item.name ?? 'anonymous',
        core: !!item.core,
        type: item.type,
      })
    }
  }
}

export const runExit = async <T extends Extension>(items: T[], ctx: Context, bus?: EventBus<EventEmitter2>) => {
  for (const item of items) {
    if (item.exit) {
      await item.exit(ctx)
    }

    if (bus) {
      await bus.emit(SystemEvent.ExtensionUnloaded, {
        name: item.name ?? 'anonymous',
        core: !!item.core,
        type: item.type,
      })
    }
  }
}

export const resolveFactory = <T = unknown>(
  input: FactoryInput<T>,
  opts?: {
    type: 'logger' | 'plugin' | 'executor'
    core?: boolean
  },
) => {
  return (ctx: Context) => {
    const instance =
      typeof input === 'function'
        ? (() => {
            try {
              return new (input as any)(ctx)
            } catch {
              return (input as any)(ctx)
            }
          })()
        : input

    const name =
      instance?.name ||
      instance?.constructor?.name ||
      (typeof input === 'function' ? input.name : undefined) ||
      'anonymous'

    if (instance && typeof instance === 'object') {
      instance.name = name

      instance.type = opts?.type
      instance.core = opts?.core ?? false
    }

    return instance
  }
}

export const buildFactories = <T = unknown>(factories: Factory<T>[], ctx: Context) => {
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

export const loadUserSetup = async (context: Context, setup: SetupContainer) => {
  const userModule = await import(context.packagePath)

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
  bus?: EventBus<EventEmitter2>
  ctx: Context
  plugins?: PluginInput[]
  loggers?: LoggerInput[]
  reporters?: ReporterInput[]
  executor?: ExecutorInput
  setupContainer?: SetupContainer
  userCodeFn?: UserSetupFn
}) => {
  const pluginRegistry = new PluginRegistry()
  const loggerRegistry = new LoggerRegistry()

  const {plugins, loggers, executor, ctx} = opts

  plugins?.forEach((plugin) => pluginRegistry.use(plugin, true))
  loggers?.forEach((logger) => loggerRegistry.use(logger, true))

  const setup =
    opts.setupContainer ??
    new SetupContainer({
      bus: opts.bus,
      pluginRegistry,
      loggerRegistry,
    })

  const userCodeFn = opts.userCodeFn ?? loadUserSetup

  const settings = await userCodeFn(ctx, setup)

  /*if (settings?.disableCoreLoggers) {
    // remove
  }

  if (settings?.disableCorePlugins) {
    // remove
  }*/

  if (executor) {
    setup.executor(executor)
  }

  return setup.build(ctx)
}

export const emit = async <T = unknown>(hooks: Hooks[], _: string, payload: T) => {
  for (const hook of hooks) {
    if (!hook.on || typeof hook.on !== 'function') continue

    await hook.on(payload)
  }
}
