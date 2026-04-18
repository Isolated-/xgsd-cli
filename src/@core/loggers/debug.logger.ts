import {WorkflowContext} from '../@engine/context.builder'
import {Block} from '../@engine/types/block.types'
import {Logger, LoggerLevel} from '../@engine/types/interfaces/logger.interface'
import {ProjectContext} from '../@engine/types/project.types'
import {RetryAttempt} from '../@engine/types/retry.types'

export class DebugLogger implements Logger {
  log(message: any): void {
    console.log(`[debug] ${message.message} (${message.level})`)
  }
}
