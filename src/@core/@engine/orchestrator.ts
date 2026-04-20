import {PipelineStep, PipelineState} from '../@types/pipeline.types'
import {deepmerge2} from '../util/object.util'
import {WorkflowContext} from './context.builder'
import {executeBlocks, ExecutionMode, Runnable} from './process/orchestration.process'
import {ProjectEvent, BlockEvent} from './types/events.types'
import {Executor} from './types/generics/executor.interface'
import EventEmitter2 from 'eventemitter2'
import {WorkflowError} from './error'
import {Block, Context} from '../config'
import {EventBus} from './event'
import {SourceData} from '@xgsd/engine'

export class Orchestrator {
  constructor(
    public context: Context,
    private executor: Executor,
    private bus: EventBus<EventEmitter2>,
  ) {}

  async before(): Promise<void> {
    await this.event(ProjectEvent.Started, {context: this.context})
  }

  async event(name: ProjectEvent | BlockEvent, payload: any): Promise<void> {
    await this.bus.emit(name, payload)
  }

  async orchestrate(data: SourceData): Promise<void> {
    // fire start event
    await this.before()

    const ctx = this.context
    const {config} = ctx

    process.setMaxListeners(config.blocks.length + 10)

    // import user module here too
    const userModule = await import(this.context.packagePath)
    let concurrency = config.project?.concurrency || 4
    if (ctx.mode === 'chained' || ctx.mode === 'fanout') {
      concurrency = 1
    }

    let input = deepmerge2({}, data) as Record<string, any>

    // this was refactored to reduce duplication
    // and to fix issues caused by slightly different implementations
    const results = await executeBlocks<Block>(
      input as any,
      config.blocks as any,
      ctx,
      {
        mode: config.project.mode as ExecutionMode,
        concurrency: 1,
      },
      async (block: Block, input: any) => {
        block.fn = userModule[block.run]

        block.options = {
          timeout: 5000,
          retries: 5,
          ...block.options,
        }

        const result = (await this.run(block as Block)) as Block

        // handle error/hard failures:
        if (result.error && result.error instanceof WorkflowError) {
          await this.event(BlockEvent.Failed, {
            name: result.name || result.run,
            data: result.input,
            error: result.error,
          })

          return result
        }

        if (result.state === PipelineState.Failed) {
          await this.event(BlockEvent.Failed, {
            name: result.name || result.run,
            data: result.input,
            error: result.error,
          })
        }

        return result
      },
    )

    await this.after(results)
  }

  async run(block: Block) {
    return this.executor.run(block, this.context as Context)
  }

  async after(results: Block[]): Promise<void> {
    // finalise context?

    const ctx = this.context

    ctx.state = PipelineState.Completed
    ctx.end = new Date().toISOString()

    await this.event(ProjectEvent.Ended, {
      context: ctx,
      output: results,
    })
  }
}
