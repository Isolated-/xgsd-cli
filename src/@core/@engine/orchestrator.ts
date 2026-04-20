import {SourceData, PipelineStep, PipelineState} from '../@types/pipeline.types'
import {deepmerge2} from '../util/object.util'
import {WorkflowContext} from './context.builder'
import {executeBlocks, ExecutionMode, Runnable} from './process/orchestration.process'
import {ProjectEvent, BlockEvent} from './types/events.types'
import {Executor} from './types/generics/executor.interface'
import EventEmitter2 from 'eventemitter2'
import {WorkflowError} from './error'
import {Block, Context} from '../config'
import {EventBus} from './event'

export class Orchestrator<T extends SourceData = SourceData> {
  constructor(
    public context: Context,
    private executor: Executor<T>,
    private bus: EventBus<EventEmitter2>,
  ) {}

  async before(): Promise<void> {
    await this.event(ProjectEvent.Started, {context: this.context})
  }

  async event(name: ProjectEvent | BlockEvent, payload: any): Promise<void> {
    await this.bus.emit(name, payload)
  }

  async orchestrate(data: T): Promise<void> {
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
        return block
      },
    )

    await this.after([])
  }

  async run(step: PipelineStep<T>): Promise<PipelineStep<T>> {
    return step
  }

  async after(results: PipelineStep<T>[]): Promise<void> {
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
