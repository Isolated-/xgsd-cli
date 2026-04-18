import {WorkflowContext} from '../@engine/context.builder'
import {Block} from '../@engine/types/block.types'
import {Logger, LoggerLevel} from '../@engine/types/interfaces/logger.interface'
import {ProjectContext} from '../@engine/types/project.types'
import {RetryAttempt} from '../@engine/types/retry.types'

type Msg = {
  ctx: ProjectContext
  block?: Block
  attempt?: RetryAttempt
  message: string
}

export class DebugLogger implements Logger {
  log(message: Msg): void {
    console.log(`[debug]: ${message.message}`, {hash: message.ctx.hash})
  }

  async projectStart(context: ProjectContext) {
    this.log({message: 'project started', ctx: context})
  }

  async projectEnd(context: ProjectContext): Promise<void> {
    this.log({message: 'project ended', ctx: context})
  }
}
