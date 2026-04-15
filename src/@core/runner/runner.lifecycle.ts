import {WorkflowContext} from '../@shared/context.builder'
import {WorkflowEvent} from '../workflows/workflow.events'
import {LoggerPlugin} from './plugins/logger.plugin'
import {loadUserPlugins, PluginContainer, PluginManager} from './plugin.manager'
import {ReporterPlugin} from './plugins/reporter.plugin'
import {Block, Hooks, ProjectContext} from './runner.types'
import {UserHooksPlugin} from './plugins/userhooks.plugin'

export enum ProjectEvent {
  Started = 'project.started',
  Ended = 'project.ended',
}

export enum BlockEvent {
  Started = 'block.started',
  Ended = 'block.ended',
  Failed = 'block.failed',
  Retrying = 'block.retrying',
  Skipped = 'block.skipped',
  Error = 'block.error',
}

export type Payload = {
  context: ProjectContext
  block?: Block
}

const bind = (fn: Function, manager: PluginManager, context?: ProjectContext) => (e: any) => {
  const payload = {
    context,
    ...e.payload,
    block: e.payload.step,
  }

  return fn(payload, manager)
}

export const captureRunnerEvents = (context: WorkflowContext<any>) => {
  const container = new PluginContainer()

  // core plugins
  container.use(ReporterPlugin)
  container.use(LoggerPlugin)

  // user plugins
  loadUserPlugins(context, container)

  // user hooks
  container.use((ctx) => new UserHooksPlugin(ctx))

  const hooks = container.createHooks(context)
  const manager = new PluginManager(hooks)

  // lifecycle
  context.stream.on('message', (e) => onMessage(e, manager, context))

  // project events
  context.stream.on(ProjectEvent.Started, bind(onProjectStart, manager))
  context.stream.on(ProjectEvent.Ended, bind(onProjectEnd, manager))

  // block events
  context.stream.on(BlockEvent.Started, bind(onBlockStart, manager, context))
  context.stream.on(BlockEvent.Ended, bind(onBlockEnd, manager, context))
}

export const onProjectStart = async (payload: Payload, manager: PluginManager) => {
  await manager.projectStart(payload.context)
}

export const onProjectEnd = async (payload: Payload, manager: PluginManager) => {
  await manager.projectEnd(payload.context)
}

export const onBlockStart = async (payload: Payload, manager: PluginManager) => {
  await manager.blockStart(payload.context, payload.block!)
}

export const onBlockEnd = async (payload: Payload, manager: PluginManager) => {
  await manager.blockEnd(payload.context, payload.block!)
}

export const onMessage = async (event: any, manager: PluginManager, context: ProjectContext) => {
  await manager.onMessage(event, context)
}
