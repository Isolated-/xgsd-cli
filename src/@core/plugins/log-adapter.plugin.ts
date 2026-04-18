import {Block} from '../@engine/types/block.types'
import {Plugin} from '../@engine/types/interfaces/plugin.interface'
import {ProjectContext} from '../@engine/types/project.types'
import {RetryAttempt} from '../@engine/types/retry.types'

// improve this to stream all events from orchestration/execution
// to loggers registered at runtime
// also ensure structure is formalised to prevent misuse
export class LogAdapterPlugin implements Plugin {
  constructor(private context: ProjectContext) {}

  private async _log(message: string, level: any, context?: ProjectContext, block?: Block, attempt?: RetryAttempt) {
    this.context.stream.emit('message', {
      log: {
        level,
        message,
        timestamp: new Date().toISOString(),
        node: process.version,
        runner: 'xgsd@v1',
        context: context?.id || this.context.id,
        workflow: context?.name || this.context.name,
        project: context?.name || this.context.name,
        step: block ? block.name : undefined,
        block: block ? block.name : undefined,
        attempt,
      },
    })
  }

  async projectStart(context: ProjectContext): Promise<void> {
    await this._log('project start', 'info', context)
  }

  async projectEnd(context: ProjectContext): Promise<void> {
    await this._log('project end', 'info', context)
  }

  async blockStart(context: ProjectContext, block: Block): Promise<void> {
    this._log('block start', 'info', context, block)
  }

  async blockEnd(context: ProjectContext, block: Block): Promise<void> {
    this._log('block end', 'info', context, block)
  }

  async blockWait(context: ProjectContext, block: Block): Promise<void> {
    this._log('block wait', 'info', context, block)
  }

  async blockRetry(context: ProjectContext, block: Block): Promise<void> {
    this._log('block retry', 'info', context, block)
  }

  async blockSkip(context: ProjectContext, block: Block): Promise<void> {
    this._log('block skip', 'info', context, block)
  }
}
