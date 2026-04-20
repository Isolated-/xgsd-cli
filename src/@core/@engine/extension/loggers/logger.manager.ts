import EventEmitter2 from 'eventemitter2'
import {Manager} from '../../types/generics/manager.interface'
import {Logger, LogMessage} from '../../types/interfaces/logger.interface'
import {ProjectContext} from '../../types/project.types'
import {emit, runExit, runInit} from '../util'
import {EventBus} from '@xgsd/engine'
import {Context} from '../../../config'

export class LoggerManager implements Manager {
  constructor(
    private loggers: Logger[],
    private bus: EventBus<EventEmitter2>,
  ) {}

  // this is plugin focused
  async emit(event: string, payload: any): Promise<void> {
    throw new Error('method not implemented')
  }

  async log(message: any): Promise<void> {
    let msg = message
    for (const logger of this.loggers) {
      if (!logger) continue

      if (!message.event && !message.payload) {
        msg = {
          event: 'unknown',
          payload: typeof message !== 'object' ? {message} : message,
        }
      }

      await logger.log(msg)
    }
  }

  async init(ctx: Context, bus?: EventBus<EventEmitter2>): Promise<void> {
    return runInit(this.loggers, ctx, bus)
  }

  async exit(ctx: Context, bus?: EventBus<EventEmitter2>): Promise<void> {
    return runExit(this.loggers, ctx, bus)
  }
}
