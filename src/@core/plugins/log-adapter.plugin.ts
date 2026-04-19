import {WorkflowContext} from '../@engine/context.builder'
import {EventBus} from '../@engine/extension/lifecycle'
import {Block} from '../@engine/types/block.types'
import {BlockEvent, ProjectEvent} from '../@engine/types/events.types'
import {LoggerEvent, LoggerLevel} from '../@engine/types/interfaces/logger.interface'
import {Plugin} from '../@engine/types/interfaces/plugin.interface'
import {ProjectContext} from '../@engine/types/project.types'
import {RetryAttempt} from '../@engine/types/retry.types'

// improve this to stream all events from orchestration/execution
// to loggers registered at runtime
// also ensure structure is formalised to prevent misuse
export class LogAdapterPlugin implements Plugin {
  private bus!: EventBus

  constructor(context: ProjectContext) {
    this.bus = new EventBus(context.stream)
  }

  async _event(e: Partial<LoggerEvent>) {
    await this.bus.emit('message', {
      log: {
        level: e.level ?? LoggerLevel.Info,
        message: e.event,
        data: e.payload,
        error: e.error,
        timestamp: new Date().toISOString(),
        meta: {
          node: process.version,
          engine: 'xgsd@v1',
        },
        isEvent: true,
      },
    })
  }

  async on<T = unknown>(event: string, payload: T): Promise<void> {
    this._event({
      event: event as any,
      payload,
      isEvent: true,
    })
  }
}
