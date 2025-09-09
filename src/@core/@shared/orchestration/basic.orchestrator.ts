import ms = require('ms')
import {PipelineState, PipelineStep, SourceData} from '../../@types/pipeline.types'
import {WorkflowEvent} from '../../workflows/workflow.events'
import {WorkflowContext} from '../context.builder'
import {Orchestrator} from '../interfaces/orchestrator.interface'
import {runWithConcurrency} from '../process/concurrency.process'
import {executeSteps} from '../process/orchestration.process'
import {resolveStepData} from '../runner.process'
import {exponentialBackoff} from '../workflow-backoff.strategies'
import {
  dataSizeRegulator,
  finaliseStepData,
  importUserModule,
  prepareStepData,
  processStep,
} from '../workflow.step-process'
import {merge} from '../../util/object.util'
import {getDurationNumber} from '../../pipelines/pipelines.util'
import {retry} from '../runner'
import {WorkflowError} from '../workflow.error'

export class BasicOrchestrator<T extends SourceData = SourceData> implements Orchestrator<T> {
  constructor(public context: WorkflowContext<T>) {}

  async before(): Promise<void> {
    this.event(WorkflowEvent.WorkflowStarted, {
      context: this.context,
    })
  }

  event(name: WorkflowEvent, payload: any): void {
    this.context.stream.emit('event', {
      event: name,
      payload,
    })
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

    // import user module here too
    const userModule = await import(this.context.package)
    let concurrency = config.options.concurrency || 4
    if (ctx.mode === 'chained' || ctx.mode === 'fanout') {
      concurrency = 1
    }

    // execute
    await runWithConcurrency(steps, concurrency, async (step, idx) => {
      step.fn = userModule[step.run ?? step.action!]

      this.event(WorkflowEvent.StepStarted, {
        context: this.context,
        step,
      })

      const result = await this.run({
        ...step,
        after: this.context.config.steps[idx],
      })

      this.event(WorkflowEvent.StepCompleted, {
        step: result,
        context: this.context,
      })
    })

    await this.after()
  }

  async run(step: PipelineStep<T>): Promise<PipelineStep<T>> {
    const ctx = this.context
    const prepared = prepareStepData(step, ctx as any)

    // emit event step started
    ctx.stream.emit('event', {
      event: WorkflowEvent.StepStarted,
      payload: {
        step: prepared,
        context: ctx,
      },
    })

    const retries = prepared.options?.retries || 0
    const timeout = getDurationNumber(prepared.options?.timeout as string) || 0
    const delay = getDurationNumber(prepared.options?.delay as string) || 0
    prepared.errors = []

    const result = await retry(prepared.input, step.fn!, prepared.options?.retries || 0, {
      timeout,
      delay: exponentialBackoff,
      onAttempt: async (a) => {
        prepared.state = PipelineState.Retrying
        prepared.attempt = a.attempt + 1
        prepared.errors!.push(a.error) // this can be removed in v0.4+ (streaming to logs is implemented)
      },
    })

    let data: any
    try {
      data = dataSizeRegulator(result.data)
    } catch (error) {
      prepared.error = error
      prepared.errors!.push(error as WorkflowError)
      prepared.state = PipelineState.Failed
      prepared.endedAt = new Date().toISOString()
      prepared.duration = Date.parse(prepared.endedAt) - Date.parse(prepared.startedAt)
      return finaliseStepData(prepared, ctx as any)
    }

    let output = data

    if (
      typeof output === 'number' ||
      typeof output === 'string' ||
      typeof output === 'boolean' ||
      Array.isArray(output)
    ) {
      output = {data: output}
    }

    prepared.output = (output as Record<string, any>) || {}
    prepared.error = result.error
    prepared.options = {retries, timeout}
    prepared.state = result.error ? PipelineState.Failed : PipelineState.Completed
    prepared.endedAt = new Date().toISOString()
    prepared.duration = Date.parse(prepared.endedAt) - Date.parse(prepared.startedAt)

    return finaliseStepData(prepared, ctx as any)
  }

  async after(): Promise<void> {
    this.event(WorkflowEvent.WorkflowCompleted, {
      context: this.context,
    })
  }
}
