type Events = Record<string, any>

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

export class EventBus<T extends EventBusAdapter, E extends Events = Record<string, any>> {
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
    await this.stream.emit(event as string, {
      event,
      payload,
      timestamp: new Date().toISOString(),
    })
  }

  // -------------------------
  // UTILS (optional passthrough)
  // -------------------------

  listenerCount?(event: keyof E): number
  removeAll?(): void
}
