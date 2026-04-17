import {Block} from '../types/block.types'
import {ProjectEvent, BlockEvent} from '../types/events.types'
import {ProjectContext} from '../types/project.types'
import {RetryAttempt} from '../types/retry.types'
import {PluginManager} from './plugin.manager'
import {InvokeFn} from './plugin.util'

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
 *  Attaches listeners for incoming events used by Plugins
 *
 *  @param {PluginManager} manager
 *  @param {ProjectContext} context
 */
export const attachPluginEventListeners = (manager: PluginManager, context: ProjectContext) => {
  const formattedContext = context.format!()

  for (const [event, handler] of Object.entries(EVENT_MAP)) {
    context.stream.on(event, async (e: any) => {
      const payload = e.payload || {}

      await manager.emit(handler as InvokeFn, formattedContext, payload.step, payload.attempt)
    })
  }
}
