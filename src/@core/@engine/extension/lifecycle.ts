import {ProjectEvent, BlockEvent} from '../types/events.types'
import {Manager} from '../types/generics/manager.interface'
import {ProjectContext} from '../types/project.types'
import {LoggerManager} from './loggers/logger.manager'
import {InvokeFn} from './util'

const EVENT_MAP = {
  [ProjectEvent.Started]: 'projectStart',
  [ProjectEvent.Ended]: 'projectEnd',
  [BlockEvent.Started]: 'blockStart',
  [BlockEvent.Ended]: 'blockEnd',
  [BlockEvent.Retrying]: 'blockRetry',
  [BlockEvent.Skipped]: 'blockSkip',
  [BlockEvent.Waiting]: 'blockWait',
} as const

/**
 *  Attaches listeners for incoming events used by Extensions
 *
 *  @param {Manager} manager
 *  @param {ProjectContext} context
 */
export const attachManagerLifecycleListeners = (manager: Manager, context: ProjectContext) => {
  const formattedContext = context.format!()

  for (const [event, handler] of Object.entries(EVENT_MAP)) {
    context.stream.on(event, async (e: any) => {
      const payload = e.payload || {}

      await manager.emit(handler as InvokeFn, formattedContext, payload.step, payload.attempt)
    })
  }
}

export const attachProcessLogAdapter = async (context: ProjectContext, manager: LoggerManager): Promise<void> => {
  context.stream.on('message', async (e) => await manager.log(e.log))
  //context.stream.on('error', (e) => adapter.error(e))
}
