import {EventBus} from '@xgsd/engine'
import {SourceData, PipelineStep, PipelineState} from '../@types/pipeline.types'
import {deepmerge2} from '../util/object.util'
import {WorkflowContext} from './context.builder'
import {executeSteps} from './process/orchestration.process'
import {ProjectEvent, BlockEvent} from './types/events.types'
import {Executor} from './types/generics/executor.interface'
import EventEmitter2 from 'eventemitter2'
import {WorkflowError} from './error'

export class Orchestrator<T extends SourceData = SourceData> {
  constructor(
    public context: WorkflowContext<T>,
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

    process.setMaxListeners(config.steps.length + 10)

    // import user module here too
    const userModule = await import(this.context.package)
    let concurrency = config.options.concurrency || 4
    if (ctx.mode === 'chained' || ctx.mode === 'fanout') {
      concurrency = 1
    }

    let input = deepmerge2({}, data) as Record<string, any>

    // this was refactored to reduce duplication
    // and to fix issues caused by slightly different implementations
    await executeSteps(
      config.steps,
      input,
      ctx,
      {
        mode: config.mode,
        ...config.options,
      },
      async (step, context) => {
        // drop "action" before v0.5 release
        step.fn = userModule[step.run ?? step.action!]

        const result = await this.run({
          ...step,
          input: context.input,
        })

        // handle error/hard failures:
        if (result.error && result.error instanceof WorkflowError) {
          await this.event(BlockEvent.Failed, result.error)
        }

        return result
      },
    )

    await this.after()
  }

  async run(step: PipelineStep<T>): Promise<PipelineStep<T>> {
    return this.executor.run(step, this.context)
  }

  async after(): Promise<void> {
    // finalise context?

    const ctx = this.context

    ctx.state = PipelineState.Completed
    ctx.end = new Date().toISOString()

    await this.event(ProjectEvent.Ended, {
      context: ctx,
    })
  }
}
