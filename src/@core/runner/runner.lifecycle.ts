import {WorkflowContext} from '../@shared/context.builder'
import {LoggerPlugin} from './plugins/logger.plugin'
import {PluginManager} from './plugin.manager'
import {ReporterPlugin} from './plugins/reporter.plugin'
import {Block, Hooks, ProjectContext} from './runner.types'
import {UserHooksPlugin} from './plugins/userhooks.plugin'
import {RetryAttempt} from '../@shared/runner/retry.runner'
import {loadUserPlugins, PluginContainer} from './plugin.container'

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
  Waiting = 'block.waiting',
  Error = 'block.error',
}

export type Payload = {
  context: ProjectContext
  block?: Block
  attempt?: RetryAttempt
}

const bind = (fn: Function, manager: PluginManager, context?: ProjectContext) => (e: any) => {
  const payload = {
    context,
    ...e.payload,
    block: e.payload.step,
  }

  payload.context = payload.context.format()

  return fn(payload, manager)
}

export const createPluginManager = (context: ProjectContext) => {
  const container = new PluginContainer(context)

  // as the project grows
  // may want to remove these
  // and load them as user plugins instead
  container.use(ReporterPlugin)
  container.use(LoggerPlugin)

  // user plugins
  loadUserPlugins(context.format!() as any, container)

  // user hooks
  container.use((ctx) => new UserHooksPlugin(ctx))

  const hooks = container.createHooks(context)
  const manager = new PluginManager(hooks)

  return manager
}

export const captureRunnerEvents = (context: WorkflowContext<any>) => {
  const manager = createPluginManager(context)

  // project events
  context.stream.on(ProjectEvent.Started, bind(onProjectStart, manager))
  context.stream.on(ProjectEvent.Ended, bind(onProjectEnd, manager))

  // block events
  context.stream.on(BlockEvent.Started, bind(onBlockStart, manager, context))
  context.stream.on(BlockEvent.Ended, bind(onBlockEnd, manager, context))
  context.stream.on(BlockEvent.Retrying, bind(onBlockRetry, manager, context))
  context.stream.on(BlockEvent.Skipped, bind(onBlockSkipped, manager, context))
  context.stream.on(BlockEvent.Waiting, bind(onBlockWaiting, manager, context))
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

export const onBlockRetry = async (payload: Payload, manager: PluginManager) => {
  await manager.blockRetry(payload.context, payload.block!, payload.attempt!)
}

export const onBlockWaiting = async (payload: Payload, manager: PluginManager) => {
  await manager.blockWait(payload.context, payload.block!)
}

export const onBlockSkipped = async (payload: Payload, manager: PluginManager) => {
  await manager.blockSkip(payload.context, payload.block!)
}

export const onMessage = async (event: any, manager: PluginManager, context: ProjectContext) => {
  await manager.onMessage(event, context.serialise!() as any)
}
