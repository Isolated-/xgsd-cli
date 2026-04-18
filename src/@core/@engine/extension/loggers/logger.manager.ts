import {Manager} from '../../types/generics/manager.interface'
import {Logger} from '../../types/interfaces/logger.interface'
import {invoke, InvokeFn} from '../util'

export class LoggerManager implements Manager {
  constructor(private loggers: Logger[]) {}

  // this is plugin focused
  async emit(event: InvokeFn, ...args: any[]): Promise<void> {
    await invoke(this.loggers, event, args[0], args[1], args[2])
  }

  async log(message: any): Promise<void> {
    for (const logger of this.loggers) {
      if (!logger) continue
      await logger.log(message)
    }
  }
}
