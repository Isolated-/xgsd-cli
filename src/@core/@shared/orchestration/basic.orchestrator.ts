import {PipelineState, PipelineStep, SourceData} from '../../@types/pipeline.types'
import {WorkflowContext} from '../context.builder'
import {Orchestrator} from '../interfaces/orchestrator.interface'
import {runWithConcurrency} from '../process/concurrency.process'
import {resolveStepData} from '../runner.process'
import {exponentialBackoff} from '../workflow-backoff.strategies'
import {processStep} from '../workflow.step-process'
import {deepmerge2, merge} from '../../util/object.util'
import {BlockEvent, ProjectEvent} from '../../runner/runner.lifecycle'
import {ProjectContext} from '../../runner/runner.types'

export class BasicOrchestrator<T extends SourceData = SourceData> implements Orchestrator<T> {
  constructor(public context: WorkflowContext<T>) {}

  async before(): Promise<void> {
    this.event(ProjectEvent.Started, {context: this.context})
  }

  event(name: ProjectEvent | BlockEvent, payload: any): void {
    // leave this here for now (may break logging)
    //this.context.stream.emit('event', {
    //  event: name,
    //  payload,
    //})

    this.context.stream.emit(name, {event: name, payload})
  }

  async orchestrate(): Promise<void> {
    // fire start event
    await this.before()

    const ctx = this.context
    const {config} = ctx

    // instead of resolving step data per step
    // resolve it here
    let steps: PipelineStep<T>[] = config.steps || []
    steps = steps.map((step) => ({
      ...resolveStepData(step, {
        config,
        data: config.data,
      }),
      after: step.after,
      options: merge(config.options, step.options),
    }))

    process.setMaxListeners(config.steps.length + 10)

    // import user module here too
    const userModule = await import(this.context.package)
    let concurrency = config.options.concurrency || 4
    if (ctx.mode === 'chained' || ctx.mode === 'fanout') {
      concurrency = 1
    }

    let input = deepmerge2({}, config.data) as Record<string, any>
    let results: PipelineStep<T>[] = []

    if (ctx.mode === 'batched') {
      const batchSize = concurrency

      for (let i = 0; i < steps.length; i += batchSize) {
        const batch = steps.slice(i, i + batchSize)
        console.log(input)

        const batchResults: PipelineStep[] = []
        await runWithConcurrency(batch, batch.length, async (step, idx) => {
          step.fn = userModule[step.run ?? step.action!]
          step.data = input
          const result = await this.run(step)
          batchResults.push(result)
          return result
        })

        // merge batch outputs for next batch input
        const reduced = batchResults.reduce((acc, step) => {
          acc = deepmerge2(acc, step.output) as any
          return acc
        }, {})

        input = deepmerge2(input, reduced) as any
        console.log(input)
        results.push(...batchResults)
      }

      results = []
      return
    }

    // execute
    await runWithConcurrency(steps, concurrency!, async (step, idx) => {
      step.fn = userModule[step.run ?? step.action!]
      step.input = input as T // don't need to assign to `data` each time

      const result = await this.run(step)

      // merge chained ouputs for next step input
      if (ctx.mode === 'chained') {
        input = deepmerge2(input, result.output) as any
      }

      results.push(result)
    })

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
