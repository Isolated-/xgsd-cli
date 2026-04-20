import {ProjectEvent, SystemEvent} from '../@engine/types/events.types'
import {Logger, LogMessage, LoggerLevel} from '../@engine/types/interfaces/logger.interface'
import ms = require('ms')

export class DebugLogger implements Logger {
  log(event: any): void {
    if (event.event === SystemEvent.SystemMessage) {
      console.log(`[DebugLogger] message: ${event.payload.message}`)
    }
  }
}
