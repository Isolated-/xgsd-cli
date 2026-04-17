import {Block} from '../types/block.types'
import {ProjectEvent, BlockEvent} from '../types/events.types'
import {ProjectContext} from '../types/project.types'
import {RetryAttempt} from '../types/retry.types'
import {PluginManager} from './plugin.manager'

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

/**
 *  Attaches listeners for incoming events used by Plugins
 *
 *  (alias for captureRunnerEvents)
 *
 *  Use this for readability
 *
 *  @param {PluginManager} manager
 *  @param {ProjectContext} context
 */
export const attachPluginEventListeners = (manager: PluginManager, context: ProjectContext) => {
  captureRunnerEvents(manager, context)
}

/**
 *  EVENT WIRING
 *  Mapping incoming events to respective handlers
 */
export const captureRunnerEvents = (manager: PluginManager, context: ProjectContext) => {
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

/**
 *  EVENT HANDLERS
 *  These map to PluginManager methods
 */
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
