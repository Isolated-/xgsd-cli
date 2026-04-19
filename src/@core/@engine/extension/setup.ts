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
import {ReporterRegistry} from './reporters/reporter.registry'
import {ReporterManager} from './reporters/reporter.manager'
import {EventBus} from './lifecycle'

export type SetupOpts = {
  // di
  pluginRegistry?: PluginRegistry
  loggerRegistry?: LoggerRegistry
  reporterRegistry?: ReporterRegistry

  bus?: EventBus
}

export class SetupContainer {
  private pluginContainer: PluginRegistry
  private loggerRegistry: LoggerRegistry
  private reporterRegistry: ReporterRegistry

  private executorFactory?: (ctx: ProjectContext) => Executor

  constructor(opts?: SetupOpts) {
    this.pluginContainer = opts?.pluginRegistry || new PluginRegistry()
    this.loggerRegistry = opts?.loggerRegistry || new LoggerRegistry()
    this.reporterRegistry = opts?.reporterRegistry || new ReporterRegistry()
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

  async build(context: ProjectContext): Promise<{
    pluginManager: PluginManager
    loggerManager: LoggerManager
    reporterManager: ReporterManager
    executor: Executor
  }> {
    const defaultExecutor = context.config.lite ? new InProcessExecutor() : new ProcessExecutor()

    const pluginManager = new PluginManager(this.pluginContainer.build(context))
    const loggerManager = new LoggerManager(this.loggerRegistry.build(context))
    const reporterManager = new ReporterManager(this.reporterRegistry.build(context))
    const executor = this.executorFactory ? this.executorFactory(context) : defaultExecutor

    await loggerManager.init(context)
    await pluginManager.init(context)
    await reporterManager.init(context)

    return {
      pluginManager,
      loggerManager,
      reporterManager,
      executor,
    }
  }
}
