import {BaseManager, Manager} from '../types/generics/manager.interface'
import {Logger} from '../types/interfaces/logger.interface'
import {invoke, InvokeFn} from '../util'

export class LoggerManager extends BaseManager<Logger> {
  constructor(loggers: Logger[] = []) {
    super(loggers)
  }
}
