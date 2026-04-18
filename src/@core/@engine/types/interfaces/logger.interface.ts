import {SourceData} from '../../../@types/pipeline.types'
import {WrappedError} from '../../execution/error'
import {BlockEvent, ProjectEvent} from '../events.types'
import {Hooks} from '../hooks.types'

export enum LoggerLevel {
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export type LoggerEvent<T extends SourceData = unknown> = {
  level: LoggerLevel
  event: ProjectEvent | BlockEvent
  payload: T
  error?: WrappedError
  timestamp: string
  meta: {
    node: string
    engine: string
  }
  isEvent: boolean
}

export interface Logger<T = unknown> extends Hooks {
  log(event: LoggerEvent<T>): Promise<void> | void
  error?(event: LoggerEvent<T>): Promise<void> | void
}
