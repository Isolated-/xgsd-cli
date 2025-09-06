import {
  createReadStream,
  ensureDirSync,
  pathExistsSync,
  readFileSync,
  readJsonSync,
  rmSync,
  writeJsonSync,
} from 'fs-extra'
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
import {getObjectProfileSize} from '../util/debug.util'
import {workflowResultLogger} from '../pipelines/pipeline.concrete'
import {join} from 'path'
import {date} from 'joi'
import {WorkflowError} from '../@shared/workflow.error'

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
        handleWorkflowEnded(context)
        break
      case WorkflowEvent.StepStarted:
        handleStepStarted(context, event.payload.step)
        break
      case WorkflowEvent.StepCompleted:
        handleStepComplete(context, event.payload.step, event.payload.memory)
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

  const timeout = getDurationString(step.options?.timeout || context.config.options.timeout!)
  const retries = step.options?.retries!

  log(`${name} - has started, timeout: ${timeout}, retries: ${retries}.`, 'info', context, step)
  log(`description: ${step.description || 'no description'}`, 'info', context, step)

  if (context.config.print?.input) {
    log(`${name} - input data: ${JSON.stringify(step.input || {})}`, 'info', context, step)
  }
}

export const handleStepComplete = (context: WorkflowContext, step: PipelineStep, memory: string) => {
  let name = step.name ? step.name : 'unknown'
  const duration = getDurationString(step.duration || 0)

  let message = `${name} has completed successfully in ${duration}`

  if (step.state === PipelineState.Failed) {
    message = `${name} has failed, error: ${step.errors?.[0].message}, took ${duration}`
  }

  if (context.config.print?.output) {
    log(`${name} output data: ${JSON.stringify(step.output || {})}`, 'info', context, step)
  }

  log(message, step.state === PipelineState.Failed ? 'error' : 'success', context)

  // open result file and append to `steps` vs streaming
  // this is to avoid issues with multiple processes writing to the same file
  // and to avoid multiple moving parts
  const path = join(context.output, 'results', `results-${context.start}.json`)

  if (pathExistsSync(path)) {
    const context = readJsonSync(path) as WorkflowContext

    const errors = (step.errors || []).map((error) => ({
      name: error.name,
      message: error.message,
      stack: error.stack,
    }))

    const formatted = {
      name: step.name,
      description: step.description,
      state: step.state,
      run: step.run,
      if: step.if,
      env: step.env,
      enabled: step.enabled,
      options: step.options,
      errors,
      input: step.input,
      output: step.output || {},
      start: step.startedAt,
      end: step.endedAt,
      duration: step.duration,
    }

    context.steps.push(formatted as any)

    writeJsonSync(path, context, {spaces: 2, mode: 0o600})
  }
}

export const handleStepFailed = (context: WorkflowContext, step: PipelineStep, error: WrappedError) => {
  const name = step.name || step.run
  const duration = getDurationString(step.duration || 0)

  if (context.config.print?.output && step.output) {
    log(`${name} output data: ${JSON.stringify(step.output || {})}`, 'info', context, step)
  }

  log(`${name} has failed, error: ${step.errors?.[0].message}, took ${duration}.`, 'error', context, step)
}

export const handleStepFailing = (context: WorkflowContext, step: PipelineStep, attempt: RetryAttempt) => {
  let name = step.name ? step.name : step.run

  const duration = getDurationString(attempt.nextMs || 0)
  const maxRetries = step.options?.retries

  // don't log if it's the final attempt and there are no retries
  if (attempt.finalAttempt && attempt.attempt === 0) return

  // next in was a bit misleading when we have exponential backoff
  // so changed to just show the delay time
  log(
    `${name} is failing, attempt: ${attempt.attempt + 1}/${maxRetries} next in ${duration}. Error: ${
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
  const concurrency = context.config.options.concurrency || 'N/A'

  const stats = getWorkflowStats(context.config.output)
  const eta = stats.average ? getDurationString(stats.average) : 'unknown'
  const backoff = context.config.options.backoff || 'exponential'

  // refactor this later
  const isDocker = pathExistsSync('/.dockerenv')

  message = `id: ${context.id}, timeout: ${timeout}, retries: ${retries}, steps: ${steps}, backoff method: ${backoff}.`
  log(message, 'info', context)

  if (context.mode === 'async') {
    log(`maximum of ${concurrency} processes allowed to run at once.`, 'info', context)
    log(`control this with the "concurrency" option in your workflow config.`, 'info', context)
  }

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

  // create result file now
  const path = join(context.output, 'results')
  const reduced = context.format!()
  ensureDirSync(path)
  writeJsonSync(
    join(path, `results-${context.start}.json`),
    {
      ...reduced,
      steps: [],
    },
    {
      spaces: 2,
    },
  )
}

export const handleWorkflowEnded = (context: WorkflowContext) => {
  let message

  context.end = new Date().toISOString()
  context.duration = new Date(context.end).getTime() - new Date(context.start!).getTime()

  // load result file
  const path = join(context.output, 'results', `results-${context.start}.json`)
  let steps: PipelineStep[] = []

  if (!pathExistsSync(path)) {
    // something went really wrong
    return
  }

  const result = readJsonSync(path, {throws: false}) as Record<string, any>

  if (!result) {
    // something went really wrong
    return
  }

  steps = result.steps || []
  result.state = steps.some((step) => step.state === PipelineState.Completed)
    ? PipelineState.Completed
    : PipelineState.Failed

  result.end = context.end
  result.duration = context.duration
  result.config = undefined

  if (!pathExistsSync(join(context.output, 'config.json'))) {
    writeJsonSync(join(context.output, 'config.json'), context.config, {spaces: 2, mode: 0o600})
  }

  writeJsonSync(path, result, {spaces: 2, mode: 0o600})

  const failed = steps.filter((step) => step.state === PipelineState.Failed)
  const succeeded = steps.filter((step) => step.state === PipelineState.Completed)
  const skipped = steps.filter((step) => step.state === PipelineState.Skipped)
  const unknown = context.config.steps.length - (failed.length + succeeded.length + skipped.length)

  const duration = getDurationString(context.duration!)

  if (context.state === PipelineState.Failed) {
    message = `workflow "${context.name}" failed, id: ${context.id}.`
    log(message, 'error', context)
  }

  message = `executed ${steps.length} steps, ${succeeded.length} succeeded, ${failed.length} failed and ${skipped.length} skipped in ${duration}.`
  log(message, 'success', context)

  if (unknown !== 0) {
    log(
      `${unknown} steps finished in a state that wasn't detectable, this likely means something went wrong with xGSD.`,
      'warn',
      context,
    )
  }
}
