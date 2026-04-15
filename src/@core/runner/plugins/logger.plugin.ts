import chalk from 'chalk'
import {Hooks, ProjectContext, Block} from '../runner.types'

export class LoggerPlugin implements Hooks {
  protected async log(message: string, level: string, context: ProjectContext, block?: Block): Promise<void> {
    context.stream.emit('message', {
      log: {
        level,
        message,
        timestamp: new Date().toISOString(),
        node: process.version,
        runner: 'xgsd@v1',
        context: context.id,
        workflow: context.name,
        project: context.name,
        step: block ? block.name : undefined,
        block: block ? block.name : undefined,
      },
    })
  }

  async projectStart(context: ProjectContext): Promise<void> {
    let message = `workflow "${key(context.name.slice(-30))}" (v${key(context.config.version)}) started in ${key(
      context.mode,
    )} mode.`

    this.log(message, 'info', context)
  }

  async projectEnd(context: ProjectContext): Promise<void> {
    let message = `everything completed!`

    this.log(message, 'success', context)
  }

  async blockStart(context: ProjectContext, block: Block): Promise<void> {
    let message = `block started!`

    this.log(message, 'info', context, block)
  }

  async blockEnd(context: ProjectContext, block: Block): Promise<void> {
    let message = `block ended!`

    this.log(message, 'info', context, block)
  }
}

// move this to utils
export const key = (key: any) => chalk.bold(key)
