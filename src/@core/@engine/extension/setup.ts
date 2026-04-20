import {WorkflowContext} from '../context.builder'
import {InProcessExecutor} from '../executors/in-process.executor'
import {ProcessExecutor} from '../executors/process.executor'
import {PluginRegistry} from './plugins/plugin.registry'
import {PluginManager} from './plugins/plugin.manager'
import {ExecutorInput, LoggerInput, PluginInput, ReporterInput} from '../types/factory.types'
import {Executor} from '../types/generics/executor.interface'
import {ProjectContext} from '../types/project.types'
import {loadUserSetup, resolveFactory, UserSetupFn} from './util'
import {LoggerRegistry} from './loggers/logger.registry'
import {LoggerManager} from './loggers/logger.manager'
import {EventBus} from '@xgsd/engine'
import EventEmitter2 from 'eventemitter2'
import {Context} from '../../config'
import {Hooks} from '../types/hooks.types'
import {Logger} from '../types/interfaces/logger.interface'
import {Plugin} from '../types/interfaces/plugin.interface'

export type SetupOpts = {
  // di
  pluginRegistry?: PluginRegistry
  loggerRegistry?: LoggerRegistry

  bus?: EventBus<EventEmitter2>
}

export class SetupContainer {
  private pluginRegistry: PluginRegistry
  private loggerRegistry: LoggerRegistry
  private bus: EventBus<EventEmitter2>

  private executorFactory?: (ctx: ProjectContext) => Executor

  constructor(opts?: SetupOpts) {
    this.pluginRegistry = opts?.pluginRegistry || new PluginRegistry()
    this.loggerRegistry = opts?.loggerRegistry || new LoggerRegistry()
    this.bus = opts?.bus!
  }

  use(plugin: PluginInput) {
    this.pluginRegistry.use(plugin)
  }

  logger(logger: LoggerInput) {
    this.loggerRegistry.use(logger)
  }

  executor(input: ExecutorInput) {
    //this.executorFactory = resolveFactory(input, {type: 'executor'})
  }

  async build(context: Context): Promise<{
    pluginManager: PluginManager
    loggerManager: LoggerManager
    executor: Executor
  }> {
    const defaultExecutor = new ProcessExecutor()

    const plugins: Hooks[] = this.pluginRegistry.build(context)
    const loggers: Logger[] = this.loggerRegistry.build(context)
    const executor = defaultExecutor

    const pluginManager = new PluginManager(plugins, this.bus)
    const loggerManager = new LoggerManager(loggers, this.bus)

    //const executor = this.executorFactory ? this.executorFactory(context) : defaultExecutor

    return {
      pluginManager,
      loggerManager,
      executor,
    }
  }
}
