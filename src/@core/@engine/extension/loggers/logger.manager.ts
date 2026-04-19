import {Manager} from '../../types/generics/manager.interface'
import {Logger} from '../../types/interfaces/logger.interface'
import {ProjectContext} from '../../types/project.types'
import {EventBus} from '../lifecycle'
import {emit, runExit, runInit} from '../util'

export class LoggerManager implements Manager {
  constructor(private loggers: Logger[]) {}

  // this is plugin focused
  async emit(event: string, payload: any): Promise<void> {
    await emit(this.loggers, event, payload)
  }

  async log(message: any): Promise<void> {
    for (const logger of this.loggers) {
      if (!logger) continue
      await logger.log(message)
    }
  }

  async init(ctx: ProjectContext): Promise<void> {
    return runInit(this.loggers, ctx)
  }

  async exit(ctx: ProjectContext): Promise<void> {
    return runExit(this.loggers, ctx)
  }
}
