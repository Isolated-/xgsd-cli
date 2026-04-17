import {PipelineState, PipelineStep, SourceData} from '../../@types/pipeline.types'
import {WorkflowContext} from '../context.builder'
import {Orchestrator} from '../types/interfaces/orchestrator.interface'
import {exponentialBackoff} from '../backoff'
import {processStep} from '../block.process'
import {deepmerge2, merge} from '../../util/object.util'
import {executeSteps} from '../process/orchestration.process'
import {BlockEvent, ProjectEvent} from '../types/events.types'

export class BasicOrchestrator<T extends SourceData = SourceData> implements Orchestrator<T> {
  constructor(public context: WorkflowContext<T>) {}

  async before(): Promise<void> {
    this.event(ProjectEvent.Started, {context: this.context})
  }

  event(name: ProjectEvent | BlockEvent, payload: any): void {
    this.context.stream.emit(name, {event: name, payload})
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
      async (step, input) => {
        // drop "action" before v0.5 release
        step.fn = userModule[step.run ?? step.action!]

        const result = await this.run({
          ...step,
          input,
        })

        this.event(BlockEvent.Ended, {step: result, context: ctx})

        return result
      },
    )

    await this.after()
  }

  async run(step: PipelineStep<T>): Promise<PipelineStep<T>> {
    return processStep(
      step,
      this.context,
      exponentialBackoff,
      async (attempt) => {
        this.event(BlockEvent.Retrying, {
          step,
          attempt,
          context: this.context,
        })
      },
      (name: string, payload) => {
        this.event(name as BlockEvent, payload)
      },
    )
  }

  async after(): Promise<void> {
    // finalise context?

    const ctx = this.context

    ctx.state = PipelineState.Completed
    ctx.end = new Date().toISOString()

    this.event(ProjectEvent.Ended, {
      context: ctx,
    })
  }
}
