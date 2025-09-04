import {pathExistsSync} from 'fs-extra'
import {WorkflowContext} from '../@shared/context.builder'
import {PipelineState, PipelineStep} from '../@types/pipeline.types'
import {
  calculateAverageWorkflowTimeFromPath,
  getDurationString,
  getWorkflowDurations,
  getWorkflowStats,
} from '../pipelines/pipelines.util'
import {RetryAttempt} from '../@shared/runner/retry.runner'
import {WrappedError} from '../@shared/runner'

export enum WorkflowEvent {
  WorkflowStarted = 'workflow.started',
  WorkflowCompleted = 'workflow.completed',
  StepStarted = 'step.started',
  StepRunning = 'step.running',
  StepCompleted = 'step.completed',
  StepFailed = 'step.failed',
  StepRetry = 'step.failing',
  StepError = 'step.error',
}

export const captureEvents = (context: WorkflowContext) => {
  context.stream.on('event', (event) => {
    if (!event) {
      return
    }

    switch (event.event) {
      case WorkflowEvent.WorkflowStarted:
        handleWorkflowStarted(context)
        break
      case WorkflowEvent.WorkflowCompleted:
        handleWorkflowEnded(
          {
            ...event.payload.context,
            stream: context.stream,
          },
          event.payload.steps || [],
        )
        break
      case WorkflowEvent.StepStarted:
        handleStepStarted(context, event.payload.step)
        break
      case WorkflowEvent.StepCompleted:
        handleStepComplete(context, event.payload.step)
        break
      case WorkflowEvent.StepRetry:
        handleStepFailing(context, event.payload.step, event.payload.attempt)
        break
      case WorkflowEvent.StepFailed:
        handleStepFailed(context, event.payload.step, event.payload.attempt)
        break
      case WorkflowEvent.StepError:
        handleStepError(context, event.payload.step, event.payload.error)
        break
    }
  })
}

export const log = (message: string, level: string, context: WorkflowContext, step?: PipelineStep) => {
  context.stream.emit('message', {
    log: {
      level,
      message,
      timestamp: new Date().toISOString(),
      node: process.version,
      runner: `xgsd@v1`,
      context: context.id,
      workflow: context.name,
      step: step ? step.name : undefined,
    },
  })
}

export const handleStepError = (context: WorkflowContext, step: PipelineStep, error: WrappedError) => {
  context.stream.emit('error', {
    error,
    context,
    step,
  })
}

export const handleStepStarted = (context: WorkflowContext, step: PipelineStep) => {
  let name = step.name ? step.name : 'unknown'

  const timeout = getDurationString(step.options?.timeout!)
  const retries = step.options?.retries!

  log(`${name} - has started, timeout: ${timeout}, retries: ${retries}.`, 'info', context, step)
  log(`description: ${step.description || 'no description'}`, 'info', context, step)

  if (context.config.print?.input) {
    log(`${name} - input data: ${JSON.stringify(step.input || {})}`, 'info', context, step)
  }
}

export const handleStepComplete = (context: WorkflowContext, step: PipelineStep) => {
  let name = step.name ? step.name : 'unknown'
  const duration = getDurationString(step.duration!)

  if (context.config.print?.output) {
    log(`${name} output data: ${JSON.stringify(step.output || {})}`, 'info', context, step)
  }

  log(`${name} has completed successfully in ${duration}.`, 'success', context)
}

export const handleStepFailed = (context: WorkflowContext, step: PipelineStep, error: WrappedError) => {
  const name = step.name || step.run
  const duration = getDurationString(step.duration!)

  if (context.config.print?.output && step.output) {
    log(`${name} output data: ${JSON.stringify(step.output || {})}`, 'info', context, step)
  }

  log(`${name} has failed, error: ${step.errors?.[0].message}, took ${duration}.`, 'error', context, step)
}

export const handleStepFailing = (context: WorkflowContext, step: PipelineStep, attempt: RetryAttempt) => {
  let name = step.name ? step.name : step.run
  const duration = getDurationString(attempt.nextMs!)
  const maxRetries = step.options?.retries
  const max = attempt.nextMs + step.options?.timeout!
  const timeout = getDurationString(max)

  // don't log if it's the final attempt and there are no retries
  if (attempt.finalAttempt && attempt.attempt === 0) return

  // next in was a bit misleading when we have exponential backoff
  // so changed to just show the delay time
  log(
    `${name} is failing, attempt: ${attempt.attempt + 1}/${maxRetries} next in ${duration} (max: ${timeout}). Error: ${
      attempt.error?.message
    }`,
    'warn',
    context,
    step,
  )
}

export const handleWorkflowStarted = (context: WorkflowContext) => {
  let message = `workflow "${context.name.slice(-30)}" (v${context.config.version}) started in ${context.mode} mode.`
  log(message, 'info', context)

  const timeout = getDurationString(context.config.options.timeout!)
  const retries = context.config.options.retries
  const steps = context.config.steps.length

  const stats = getWorkflowStats(context.config.output)
  const eta = stats.average ? getDurationString(stats.average) : 'unknown'

  // refactor this later
  const isDocker = pathExistsSync('/.dockerenv')

  message = `id: ${context.id}, timeout: ${timeout}, retries: ${retries}, steps: ${steps}.`
  log(message, 'info', context)
  log(
    `runner: ${context.runner}, cli: ${context.cli}, node: ${process.version}, config hash: ${context.hash}, os: ${
      process.platform
    }, docker: ${isDocker ? 'yes' : 'no'}.`,
    'info',
    context,
  )

  log(`description: ${context.description || 'no description'}`, 'info', context)
  log(`metadata: ${JSON.stringify(context.config.metadata || {})}`, 'info', context)

  log(
    'note: this is a work in progress, please report any issues (https://github.com/Isolated-/xgsd-cli)',
    'info',
    context,
  )

  if (context.config.print?.input) {
    log(`workflow input: ${JSON.stringify(context.config.data ?? {})}`, 'info', context)
  }

  if (eta !== 'unknown') {
    log(`this workflow takes ${eta} to complete and has been completed ${stats.total} times.`, 'info', context)
  }
}

export const handleWorkflowEnded = (context: WorkflowContext, steps: PipelineStep[]) => {
  let message
  if (context.config.collect) {
    log(`artifacts from this run will be saved to ${context.config.output}.`, 'info', context)
  }

  const failed = steps.filter((step) => step.errors && step.errors.length > 0 && !step.output)
  const succeeded = steps.filter((step) => step.state === PipelineState.Completed)
  const skipped = steps.filter((step) => step.state === PipelineState.Skipped)
  const duration = getDurationString(context.duration!)

  if (context.state === PipelineState.Failed) {
    message = `workflow "${context.name}" failed, id: ${context.id}.`
    log(message, 'error', context)
  }

  message = `executed ${steps.length} steps, ${succeeded.length} succeeded, ${failed.length} failed and ${skipped.length} skipped in ${duration}.`
  log(message, 'success', context)
}
