import {WorkflowContext} from '../@shared/context.builder'
import {WorkflowEvent} from '../workflows/workflow.events'
import {LoggerPlugin} from './plugins/logger.plugin'
import {PluginContainer, PluginManager} from './plugin.manager'
import {ReporterPlugin} from './plugins/reporter.plugin'
import {Block, Hooks, ProjectContext} from './runner.types'
import {UserHooksPlugin} from './plugins/userhooks.plugin'

export enum RunnerEvent {
  ProjectStarted = 'project.started',
  ProjectEnded = 'project.ended',
  BlockStarted = 'block.started',
  BlockEnded = 'block.ended',
  BlockFailed = 'block.failed',
  BlockRetrying = 'block.retrying',
}

export type Payload = {
  context: ProjectContext
  block?: Block
}

const bind = (fn: Function, manager: PluginManager) => (e: any) => fn(e.payload, manager)

export const onProjectStart = async (payload: Payload, manager: PluginManager) => {
  await manager.projectStart(payload.context)
}

export const onProjectEnd = async (payload: Payload, manager: PluginManager) => {
  await manager.projectEnd(payload.context)
}

function loadUserPlugins(context: ProjectContext, manager: PluginContainer) {
  const mod = require(context.package)

  if (typeof mod.register === 'function') {
    mod.register(manager)
  }
}

export const captureRunnerEvents = (context: WorkflowContext<any>) => {
  const container = new PluginContainer()

  // core plugins
  container.use(LoggerPlugin)
  container.use(ReporterPlugin)

  // user hooks
  container.use((ctx) => new UserHooksPlugin(ctx))

  // user plugins
  loadUserPlugins(context, container)

  const hooks = container.createHooks(context)
  const manager = new PluginManager(hooks)

  // project.started/workflow.started
  context.stream.on(WorkflowEvent.WorkflowStarted, bind(onProjectStart, manager))

  // project.ended/workflow.ended
  context.stream.on(WorkflowEvent.WorkflowCompleted, bind(onProjectEnd, manager))
}
