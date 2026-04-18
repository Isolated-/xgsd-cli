import chalk from 'chalk'
import {getDurationString} from '../pipelines/pipelines.util'
import {PipelineState} from '../@types/pipeline.types'
import {ProjectContext} from '../@engine/types/project.types'
import {Block} from '../@engine/types/block.types'
import {RetryAttempt} from '../@engine/types/retry.types'
import {Plugin} from '../@engine/types/interfaces/plugin.interface'

export class LoggerPlugin implements Plugin {
  constructor(private readonly context: ProjectContext) {}

  protected async log(message: string, level: string, context?: ProjectContext, block?: Block): Promise<void> {
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
      },
    })
  }

  async projectStart(context: ProjectContext): Promise<void> {
    let message = `"${key(context.name.slice(-30))}" (${key(context.config.version)}) started in ${key(
      context.mode,
    )} mode.`

    this.log(message, 'info', context)
  }

  async projectEnd(context: ProjectContext): Promise<void> {
    let message = `everything completed!`

    this.log(message, 'success', context)
  }

  async blockStart(context: ProjectContext, block: Block): Promise<void> {
    const timeout = getDurationString(block.options?.timeout || context.config.options.timeout!)
    const delay = getDurationString(block.options?.delay as string)
    const retries = block.options?.retries!
    const backoff = block.options?.backoff

    let message = `${key(block.name)} has started - timeout: ${key(timeout)}, delay: ${key(delay)}, retries: ${key(retries)}, backoff: ${key(backoff)}`

    this.log(message, 'info', context, block)

    if (context.config.print?.input) {
      this.log(`${key(block.name)} - input data: ${key(JSON.stringify(block.input || {}))}`, 'info', context, block)
    }
  }

  async blockEnd(context: ProjectContext, block: Block): Promise<void> {
    const duration = getDurationString(block.duration || 0)

    let message = `${key(block.name)} has completed successfully in ${key(duration)}`

    if (block.state === PipelineState.Failed) {
      message = `${key(block.name)} has failed, error: ${key(block.error?.message)}, took ${key(duration)}.`
    }

    if (block.state === PipelineState.Skipped) {
      message = `${key(block.name)} was skipped.`
    }

    if (context.config.print?.output) {
      this.log(`${key(block.name)} output data: ${key(JSON.stringify(block.output || {}))}`, 'info', context, block)
    }

    this.log(message, block.state === PipelineState.Failed ? 'error' : 'success', context, block)
  }

  async blockRetry(context: ProjectContext, block: Block, attempt: RetryAttempt): Promise<void> {
    let name = block.name ? block.name : block.run

    const duration = getDurationString(attempt.nextMs || 0)
    const maxRetries = block.options?.retries

    // don't log if it's the final attempt and there are no retries
    if (attempt.finalAttempt && attempt.attempt === 0) return

    // next in was a bit misleading when we have exponential backoff
    // so changed to just show the delay time
    this.log(
      `${key(name)} is failing, attempt: ${attempt.attempt + 1}/${maxRetries} next in ${key(duration)}. Error: ${key(
        attempt.error?.message,
      )}`,
      'warn',
      context,
      block,
    )
  }

  async blockSkip(context: ProjectContext, block: Block): Promise<void> {}
  async blockWait(context: ProjectContext, block: Block): Promise<void> {}
}

// move this to utils
export const key = (key: any) => chalk.bold(key)
