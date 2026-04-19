import {ProjectEvent} from '../@engine/types/events.types'
import {Logger, LoggerEvent, LoggerLevel} from '../@engine/types/interfaces/logger.interface'
import ms = require('ms')

export class DebugLogger implements Logger {
  log(event: any): Promise<void> | void {
    console.log(`[debug] message: ${event.message}`)
  }

  async on<T = unknown>(event: string, payload: T): Promise<void> {
    console.log(`[debug] event ${event}`)
  }
}
