import {WorkflowContext} from '../@engine/context.builder'
import {EventHandler} from '../@engine/extension/lifecycle'
import {Block} from '../@engine/types/block.types'
import {Logger, LoggerLevel} from '../@engine/types/interfaces/logger.interface'
import {ProjectContext} from '../@engine/types/project.types'
import {RetryAttempt} from '../@engine/types/retry.types'
import ms = require('ms')

export class DebugLogger implements Logger {
  log(message: any): void {
    console.log(`[debug] ${message.message} (${message.level})`)
  }

  async on<T = unknown>(event: string, payload: T) {
    console.log(`[debug] ${event}`)
  }

  async blockRetry(context: ProjectContext, block: Block, attempt: RetryAttempt): Promise<void> {
    console.log(
      `[debug] block ${block.name} is failing, next try in ${ms(attempt.nextMs)}, final: ${attempt.finalAttempt}`,
    )

    console.log(`[debug] error: ${attempt.error.message}`)
    console.log(`[debug] stack:`)
    console.log(attempt.error.stack)
  }
}
