import {WorkflowContext} from './context.builder'
import {InProcessExecutor} from './executors/in-process.executor'
import {ProcessExecutor} from './executors/process.executor'
import {PluginContainer, PluginManager} from './plugins'
import {ExecutorInput, PluginInput} from './types/factory.types'
import {Executor} from './types/interfaces/executor.interface'
import {ProjectContext} from './types/project.types'
import {loadUserSetup, resolveFactory, UserSetupFn} from './util'

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
    this.executorFactory = resolveFactory(input)
  }

  build(context: ProjectContext) {
    const defaultExecutor = context.config.lite ? new InProcessExecutor() : new ProcessExecutor()

    return {
      pluginManager: new PluginManager(this.pluginContainer.createHooks(context)),
      executor: this.executorFactory ? this.executorFactory(context) : defaultExecutor,
    }
  }
}
