import {Hooks} from '../hooks.types'

export enum LoggerLevel {
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}
export interface Logger<T = unknown> extends Hooks {
  log(message: T, level: LoggerLevel, ...args: any[]): Promise<void> | void
}
