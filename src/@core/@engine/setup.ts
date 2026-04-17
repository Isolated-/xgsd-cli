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
