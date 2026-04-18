import {WorkflowContext} from '../context.builder'
import {InProcessExecutor} from '../executors/in-process.executor'
import {ProcessExecutor} from '../executors/process.executor'
import {PluginRegistry} from './plugins/plugin.container'
import {PluginManager} from './plugins/plugin.manager'
import {ExecutorInput, LoggerInput, PluginInput, ReporterInput} from '../types/factory.types'
import {Executor} from '../types/generics/executor.interface'
import {ProjectContext} from '../types/project.types'
import {loadUserSetup, resolveFactory, UserSetupFn} from './util'
import {LoggerRegistry} from './loggers/logger.registry'
import {LoggerManager} from './loggers/logger.manager'
import {ReporterRegistry} from './reporters/reporter.registry'
import {ReporterManager} from './reporters/reporter.manager'

export type SetupOpts = {
  plugins?: PluginInput[]
  loggers?: LoggerInput[]
  executor?: ExecutorInput
}

export class SetupContainer {
  private pluginContainer: PluginRegistry
  private loggerRegistry: LoggerRegistry
  private reporterRegistry: ReporterRegistry

  private executorFactory?: (ctx: ProjectContext) => Executor

  constructor() {
    this.pluginContainer = new PluginRegistry()
    this.loggerRegistry = new LoggerRegistry()
    this.reporterRegistry = new ReporterRegistry()
  }

  use(plugin: PluginInput) {
    this.pluginContainer.use(plugin)
  }

  logger(logger: LoggerInput) {
    this.loggerRegistry.use(logger)
  }

  reporter(reporter: ReporterInput) {
    this.reporterRegistry.use(reporter)
  }

  executor(input: ExecutorInput) {
    this.executorFactory = resolveFactory(input)
  }

  build(context: ProjectContext): {
    pluginManager: PluginManager
    loggerManager: LoggerManager
    reporterManager: ReporterManager
    executor: Executor
  } {
    const defaultExecutor = context.config.lite ? new InProcessExecutor() : new ProcessExecutor()

    return {
      pluginManager: new PluginManager(this.pluginContainer.build(context)),
      loggerManager: new LoggerManager(this.loggerRegistry.build(context)),
      reporterManager: new ReporterManager(this.reporterRegistry.build(context)),
      executor: this.executorFactory ? this.executorFactory(context) : defaultExecutor,
    }
  }
}
