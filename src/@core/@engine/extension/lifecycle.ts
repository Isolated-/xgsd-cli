import {EventEmitter2} from 'eventemitter2'
import {ProjectEvent, BlockEvent, SystemEvent} from '../types/events.types'
import {Manager} from '../types/generics/manager.interface'
import {ProjectContext} from '../types/project.types'
import {LoggerManager} from './loggers/logger.manager'

const EVENT_MAP = {
  // project events
  [ProjectEvent.Started]: ProjectEvent.Started,
  [ProjectEvent.Ended]: ProjectEvent.Ended,

  // block events
  [BlockEvent.Started]: BlockEvent.Started,
  [BlockEvent.Ended]: BlockEvent.Ended,
  [BlockEvent.Retrying]: BlockEvent.Retrying,
  [BlockEvent.Skipped]: BlockEvent.Skipped,
  [BlockEvent.Waiting]: BlockEvent.Waiting,

  // system events
  [SystemEvent.ExtensionLoaded]: SystemEvent.ExtensionLoaded,
  [SystemEvent.ExtensionUnloaded]: SystemEvent.ExtensionUnloaded,
} as const

export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>

export class EventBus<Events extends Record<string, any> = Record<string, any>> {
  private stream: EventEmitter2

  constructor(stream?: EventEmitter2) {
    this.stream =
      stream ??
      // unhard-code these when extracting to @xgsd/engine
      new EventEmitter2({
        wildcard: true,
        delimiter: '.',
        maxListeners: 50,
      })
  }

  // subscribers
  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>) {
    this.stream.on(event as string, handler)
    return () => this.off(event, handler)
  }

  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>) {
    this.stream.off(event as string, handler)
  }

  // publishers
  async emit<K extends keyof Events>(event: K, payload: Events[K]): Promise<void> {
    const listeners = this.stream.listeners(event as string)

    console.debug(`[EventBus] ${event as string}`)

    for (const listener of listeners) {
      await listener({
        event,
        payload,
      })
    }
  }

  // utils
  listenerCount(event: keyof Events) {
    return this.stream.listenerCount(event as string)
  }

  removeAll() {
    this.stream.removeAllListeners()
  }
}

/**
 *  Attaches listeners for incoming events used by Extensions
 *
 *  @param {Manager} manager
 *  @param {ProjectContext} context
 */
export const attachManagerLifecycleListeners = (manager: Manager, bus: EventBus, context: ProjectContext) => {
  const formattedContext = context.format?.()

  const disposers: Array<() => void> = []

  for (const [event, handler] of Object.entries(EVENT_MAP)) {
    const off = bus.on(event as any, async (e: any) => {
      const payload = e?.payload ?? {}

      await manager.emit(handler, {
        context: formattedContext,
        ...payload,
      })
    })

    disposers.push(off)
  }

  // return cleanup so lifecycle can be detached
  return () => {
    for (const off of disposers) off()
  }
}

export const attachProcessLogAdapter = async (context: ProjectContext, manager: LoggerManager): Promise<void> => {
  context.stream.on('message', async (e) => {
    const {log} = e.payload
    // transform process logs into LoggerEvents
    if (log.isEvent) {
      await manager.log(log)
      return
    }

    // move this to a mapper
    const event = {
      level: e.log.level ?? 'info',
      message: e.log.message,
      error: e.log.error,
      data: {
        context: e.log.context,
      },
      isEvent: false,
    }

    await manager.log(event)
  })
}
