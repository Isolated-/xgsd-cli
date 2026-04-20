import {SourceData} from '../../../@types/pipeline.types'
import {WrappedError} from '../../execution/error'
import {BlockEvent, ProjectEvent, SystemEvent} from '../events.types'
import {Hooks} from '../hooks.types'

export enum LoggerLevel {
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export type LogMessage<T extends SourceData = unknown> = {
  event: ProjectEvent | BlockEvent | SystemEvent
  payload: T
  error?: WrappedError | null
}

export interface Logger<T = unknown> extends Hooks {
  log(event: LogMessage<T>): Promise<void> | void
  error?(event: LogMessage<T>): Promise<void> | void
}
