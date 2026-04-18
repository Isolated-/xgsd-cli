import {Block} from '../@engine/types/block.types'
import {BlockEvent, ProjectEvent} from '../@engine/types/events.types'
import {LoggerLevel} from '../@engine/types/interfaces/logger.interface'
import {Plugin} from '../@engine/types/interfaces/plugin.interface'
import {ProjectContext} from '../@engine/types/project.types'
import {RetryAttempt} from '../@engine/types/retry.types'
import {SourceData} from '../@types/pipeline.types'

export type LogEvent<T extends SourceData = unknown> = {
  level: LoggerLevel
  event: ProjectEvent | BlockEvent
  payload: T
  timestamp: string
  meta: {
    node: string
    engine: string
  }
  isEvent: boolean
}

// improve this to stream all events from orchestration/execution
// to loggers registered at runtime
// also ensure structure is formalised to prevent misuse
export class LogAdapterPlugin implements Plugin {
  constructor(private context: ProjectContext) {}

  async _event(e: Partial<LogEvent>) {
    this.context.stream.emit('message', {
      log: {
        level: e.level ?? LoggerLevel.Info,
        message: e.event,
        data: e.payload,
        timestamp: new Date().toISOString(),
        meta: {
          node: process.version,
          engine: 'xgsd@v1',
        },
        isEvent: true,
      },
    })
  }

  async projectStart(context: ProjectContext): Promise<void> {
    this._event({
      event: ProjectEvent.Started,
      payload: {
        context,
      },
    })
  }

  async projectEnd(context: ProjectContext): Promise<void> {
    this._event({
      event: ProjectEvent.Ended,
      payload: {
        context,
      },
    })
  }

  async blockStart(context: ProjectContext, block: Block): Promise<void> {
    this._event({
      event: BlockEvent.Started,
      payload: {
        context,
        block,
      },
    })
  }

  async blockEnd(context: ProjectContext, block: Block): Promise<void> {
    this._event({
      event: BlockEvent.Ended,
      payload: {
        context,
        block,
      },
    })
  }

  async blockWait(context: ProjectContext, block: Block): Promise<void> {
    this._event({
      event: BlockEvent.Waiting,
      payload: {
        context,
        block,
      },
    })
  }

  async blockRetry(context: ProjectContext, block: Block, attempt: RetryAttempt): Promise<void> {
    this._event({
      event: BlockEvent.Retrying,
      payload: {
        context,
        block,
        attempt,
      },
    })
  }

  async blockSkip(context: ProjectContext, block: Block): Promise<void> {
    this._event({
      event: BlockEvent.Skipped,
      payload: {
        context,
        block,
      },
    })
  }
}
