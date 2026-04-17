import {PipelineState, PipelineStep, SourceData} from '../../@types/pipeline.types'
import {WorkflowContext} from '../context.builder'
import {Orchestrator} from '../interfaces/orchestrator.interface'
import {runWithConcurrency} from '../process/concurrency.process'
import {resolveStepData} from '../util'
import {exponentialBackoff} from '../backoff'
import {processStep} from '../block.process'
import {deepmerge2, merge} from '../../util/object.util'
import {BlockEvent, ProjectEvent} from '../../runner/runner.lifecycle'
import {ProjectContext} from '../../runner/runner.types'
import {executeStepsV1} from '../process/orchestration.process'

export class BasicOrchestrator<T extends SourceData = SourceData> implements Orchestrator<T> {
  constructor(public context: WorkflowContext<T>) {}

  async before(): Promise<void> {
    this.event(ProjectEvent.Started, {context: this.context})
  }

  event(name: ProjectEvent | BlockEvent, payload: any): void {
    this.context.stream.emit(name, {event: name, payload})
  }

  // TODO: refactor this - shouldn't be recreating the same code
  // as within orchestration.process.ts
  // find a way to either re-use that logic or remove BasicOrchestrator entirely
  async orchestrate(): Promise<void> {
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

    let input = deepmerge2({}, config.data) as Record<string, any>

    await executeStepsV1(
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
