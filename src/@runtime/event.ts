import {RetryAttempt, SourceData, WrappedError} from '@xgsd/engine'
import {BlockEvent, ProjectEvent, SystemEvent} from './types/events.types'
import {LoggerLevel} from './types/interfaces/logger.interface'
import {Context} from 'vm'
import {Block} from './config'
import {ExtensionType} from './extension/util'

export type Events = {
  [ProjectEvent.Started]: {
    ctx: Context
  }
  [ProjectEvent.Ended]: {
    ctx: Context
  }
  [BlockEvent.Started]: {
    block: Block
  }
  [BlockEvent.Ended]: {
    block: Block
  }
  [BlockEvent.Failed]: {
    block: Block
    error: unknown
    errors?: unknown[]
  }
  [BlockEvent.Retrying]: {
    block: Block
    attempt: RetryAttempt
  }
  [BlockEvent.Waiting]: {
    block: Block
  }
  [SystemEvent.SystemMessage]: {
    level: LoggerLevel
    message: string
    data?: Record<string, unknown>
  }
  [SystemEvent.ExtensionLoaded]: {
    name: string
    core: boolean
    version?: string
    type: ExtensionType
  }
  [SystemEvent.ExtensionUnloaded]: {
    name: string
    core: boolean
    version?: string // future support
    type: ExtensionType
  }
  [key: string]: Record<string, unknown>
}

export type EventEnvelope<K extends string, T> = {
  event: K
  payload: T
  timestamp?: string
}

export type Subscribes = {
  on: (event: string, handler: (...args: any[]) => void) => void
  off: (event: string, handler: (...args: any[]) => void) => void
}

export type Publishes = {
  emit: (event: string, payload: any) => any
}

export type EventBusAdapter = Subscribes & Publishes

export class EventBus<T extends EventBusAdapter, E extends Events = Events> {
  constructor(private stream: T) {}

  // -------------------------
  // SUBSCRIBE
  // -------------------------

  on<K extends keyof E>(event: K, handler: (e: EventEnvelope<K & string, E[K]>) => void | Promise<void>): () => void {
    const wrapped = async (payload: E[K]) => {
      await handler({
        event: event as K & string,
        payload,
      })
    }

    this.stream.on(event as string, wrapped)

    return () => this.off(event, wrapped as any)
  }

  off<K extends keyof E>(event: K, handler: (...args: any[]) => void): void {
    this.stream.off(event as string, handler)
  }

  // -------------------------
  // PUBLISH
  // -------------------------

  async emit<K extends keyof E>(event: K, payload: E[K]): Promise<void> {
    // already wrapped
    if (payload.payload) {
      await this.stream.emit(event as string, payload)
      return
    }

    // will wrap
    await this.stream.emit(event as string, {
      event,
      payload,
    })
  }

  // -------------------------
  // UTILS (optional passthrough)
  // -------------------------

  listenerCount?(event: keyof E): number
  removeAll?(): void
}
