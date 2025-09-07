import {ensureDirSync, pathExistsSync, readJsonSync, rmSync, writeJsonSync} from 'fs-extra'
import {WorkflowContext} from '../@shared/context.builder'
import {PipelineState, PipelineStep} from '../@types/pipeline.types'
import {getDurationString, getWorkflowStats} from '../pipelines/pipelines.util'
import {RetryAttempt} from '../@shared/runner/retry.runner'
import {WrappedError} from '../@shared/runner'
import {join} from 'path'
import chalk from 'chalk'

export enum WorkflowEvent {
  WorkflowStarted = 'workflow.started',
  WorkflowCompleted = 'workflow.completed',
  StepStarted = 'step.started',
  StepRunning = 'step.running',
  StepWaiting = 'step.waiting',
  StepCompleted = 'step.completed',
  StepFailed = 'step.failed',
  StepRetry = 'step.failing',
  StepError = 'step.error',
}

export const key = (key: any) => chalk.bold(key)

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
      case WorkflowEvent.StepWaiting:
        handleStepWaiting(context, event.payload.step, event.payload.delayMs)
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
  const delay = getDurationString(step.options?.delay as string)
  const retries = step.options?.retries!
  const backoff = step.options?.backoff

  log(
    `${key(name)} - has started, timeout: ${key(timeout)}, retries: ${key(retries)}, delay: ${key(
      delay,
    )}, backoff method: ${key(backoff)}.`,
    'info',
    context,
    step,
  )
  log(`description: ${key(step.description || 'no description')}`, 'info', context, step)

  if (context.config.print?.input) {
    log(`${key(name)} - input data: ${key(JSON.stringify(step.input || {}))}`, 'info', context, step)
  }
}

export const handleStepWaiting = (context: WorkflowContext, step: PipelineStep, delayMs: number) => {
  let name = step.name ? step.name : 'unknown'
  const duration = getDurationString(delayMs)

  log(`${key(name)} is waiting, delaying for ${key(duration)}.`, 'info', context, step)
}

export const handleStepComplete = (context: WorkflowContext, step: PipelineStep, memory: string) => {
  let name = step.name ? step.name : 'unknown'
  const duration = getDurationString(step.duration || 0)

  let message = `${key(name)} has completed successfully in ${key(duration)}`

  if (step.state === PipelineState.Failed) {
    message = `${key(name)} has failed, error: ${key(step.error?.message)}, took ${key(duration)}.`
  }

  if (step.state === PipelineState.Skipped) {
    message = `${key(name)} was skipped.`
  }

  if (context.config.print?.output) {
    log(`${key(name)} output data: ${key(JSON.stringify(step.output || {}))}`, 'info', context, step)
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
    log(`${key(name)} output data: ${key(JSON.stringify(step.output || {}))}`, 'info', context, step)
  }

  log(
    `${key(name)} has failed, error: ${key(step.errors?.[0].message)}, took ${key(duration)}.`,
    'error',
    context,
    step,
  )
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
    `${key(name)} is failing, attempt: ${attempt.attempt + 1}/${maxRetries} next in ${key(duration)}. Error: ${key(
      attempt.error?.message,
    )}`,
    'warn',
    context,
    step,
  )
}

export const handleWorkflowStarted = (context: WorkflowContext) => {
  let message = `workflow "${key(context.name.slice(-30))}" (v${key(context.config.version)}) started in ${key(
    context.mode,
  )} mode.`
  log(message, 'info', context)

  const timeout = getDurationString(context.config.options.timeout!)
  const retries = context.config.options.retries
  const steps = context.config.steps.length
  const concurrency = context.config.options.concurrency || 'N/A'

  const stats = getWorkflowStats(join(context.output, 'results'))
  const eta = stats.average ? getDurationString(stats.average) : 'unknown'
  const backoff = context.config.options.backoff || 'exponential'

  // refactor this later
  const isDocker = pathExistsSync('/.dockerenv')

  message = `id: ${key(context.id)}, timeout: ${key(timeout)}, retries: ${key(retries)}, steps: ${key(
    steps,
  )}, backoff method: ${key(backoff)}.`
  log(message, 'info', context)

  if (context.mode === 'async') {
    log(`maximum of ${key(concurrency)} processes allowed to run at once.`, 'info', context)
    log(`control this with the "concurrency" option in your workflow config.`, 'info', context)
  }

  log(
    `runner: ${key(context.runner)}, cli: ${key(context.cli)}, node: ${key(process.version)}, config hash: ${key(
      context.hash,
    )}, os: ${key(process.platform)}, docker: ${key(isDocker ? 'yes' : 'no')}.`,
    'info',
    context,
  )

  log(`description: ${key(context.description || 'no description')}`, 'info', context)
  log(`metadata: ${key(JSON.stringify(context.config.metadata || {}))}`, 'info', context)

  log(
    'note: this is a work in progress, please report any issues (https://github.com/Isolated-/xgsd-cli)',
    'info',
    context,
  )

  if (context.config.print?.input) {
    log(`workflow input: ${key(JSON.stringify(context.config.data ?? {}))}`, 'info', context)
  }

  if (eta !== 'unknown') {
    log(
      `this workflow takes ${key(eta)} to complete and has been completed ${key(stats.total)} times.`,
      'info',
      context,
    )
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
    log(`failed to read results file, something went wrong. Please try running the workflow again.`, 'error', context)
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
  writeJsonSync(join(context.output, 'latest.json'), result, {spaces: 2, mode: 0o600})

  if (!context.config.collect?.run) {
    log(`you have disabled run collection, removing results file.`, 'warn', context)
    rmSync(join(context.output, 'results'), {recursive: true, force: true})
    rmSync(join(context.output, 'latest.json'), {force: true})
    rmSync(join(context.output, 'config.json'), {force: true})
  }

  if (!context.config.collect?.logs) {
    log(`you have disabled logs collection, removing logs file.`, 'warn', context)
    rmSync(join(context.output, 'logs'), {recursive: true, force: true})
  }

  if (!context.config.collect?.logs && !context.config.collect?.run) {
    rmSync(context.output, {recursive: true, force: true})
  }

  const failed = steps.filter((step) => step.state === PipelineState.Failed)
  const succeeded = steps.filter((step) => step.state === PipelineState.Completed)
  const skipped = steps.filter((step) => step.state === PipelineState.Skipped)
  const unknown = context.config.steps.length - (failed.length + succeeded.length + skipped.length)

  const duration = getDurationString(context.duration!)

  if (context.state === PipelineState.Failed) {
    message = `workflow "${key(context.name)}" failed, id: ${key(context.id)}.`
    log(message, 'error', context)
  }

  message = `executed ${key(steps.length)} steps, ${key(succeeded.length)} succeeded, ${key(
    failed.length,
  )} failed and ${key(skipped.length)} skipped in ${key(duration)}.`
  log(message, 'success', context)

  if (unknown !== 0) {
    log(
      `${key(
        unknown,
      )} steps finished in a state that wasn't detectable, this likely means something went wrong with xGSD.`,
      'warn',
      context,
    )
  }
}
