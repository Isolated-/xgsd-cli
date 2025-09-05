import {createReadStream, ensureDirSync, pathExistsSync, readFileSync, writeJsonSync} from 'fs-extra'
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
        handleWorkflowEnded(context, event.payload.steps || [])
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

export const handleStepComplete = (context: WorkflowContext, step: PipelineStep, memory: NodeJS.MemoryUsage) => {
  let name = step.name ? step.name : 'unknown'
  const duration = getDurationString(step.duration || 0)

  const logger = workflowResultLogger(context.config.output, context.route)
  logger.log({
    level: 'info',
    message: step.output ? JSON.stringify(step.output) : '{}',
    memory,
    timestamp: new Date().toISOString(),
    node: process.version,
    runner: `xgsd@v1`,
    context: context.id,
    workflow: context.name,
  })

  if (context.config.print?.output) {
    log(`${name} output data: ${JSON.stringify(step.output || {})}`, 'info', context, step)
  }

  log(`${name} has completed successfully in ${duration}.`, 'success', context)
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

  // refactor this later
  const isDocker = pathExistsSync('/.dockerenv')

  message = `id: ${context.id}, timeout: ${timeout}, retries: ${retries}, steps: ${steps}.`
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
}

export const handleWorkflowEnded = (context: WorkflowContext, steps: PipelineStep[]) => {
  let message

  // build report
  const readStream = createReadStream(
    join(context.config.output, context.route, 'generated', 'workflow-results.combined.jsonl'),
    {encoding: 'utf-8'},
  )

  let jsonOutput: any = {}

  let results: PipelineStep[] = []
  readStream.on('data', (chunk: string) => {
    const lines = chunk.split('\n')
    for (const line of lines) {
      try {
        if (!line) continue
        const data = JSON.parse(line)
        if (!data.message || data.context !== context.id) continue
        const step: PipelineStep = JSON.parse(data.message)
        results.push(step)
      } catch (e) {
        continue
      }
    }
  })

  readStream.on('end', () => {
    const failed = results.filter((step) => step.errors && step.errors.length > 0 && !step.output)
    const succeeded = results.filter((step) => step.state === PipelineState.Completed)
    const skipped = results.filter((step) => step.state === PipelineState.Skipped)
    const endedAt = new Date().toISOString()
    context.end = endedAt
    context.duration = new Date(endedAt).getTime() - new Date(context.start!).getTime()
    const duration = getDurationString(context.duration!)

    if (context.state === PipelineState.Failed) {
      message = `workflow "${context.name}" failed, id: ${context.id}.`
      log(message, 'error', context)
    }

    message = `executed ${steps.length} steps, ${succeeded.length} succeeded, ${failed.length} failed and ${skipped.length} skipped in ${duration}.`
    log(message, 'success', context)

    // write final report
    const nodeVersion = process.version
    const os = process.platform

    const ctx = context

    const report = {
      id: ctx.id,
      hash: ctx.hash,
      version: ctx.version,
      docker: ctx.docker,
      runner: ctx.runner,
      name: ctx.name,
      description: ctx.description,
      package: ctx.package,
      output: ctx.config.output,
      start: ctx.start,
      end: ctx.end,
      duration: ctx.duration,
      state:
        results.filter((step: any) => step.state === PipelineState.Completed).length > 0
          ? PipelineState.Completed
          : PipelineState.Failed,
      config: {
        ...ctx.config,
        node: {
          os,
          arch: process.arch,
          version: nodeVersion,
          processes: process.cpuUsage(),
          memory: process.memoryUsage(),
        },
      },
      steps: results.map((step: any) => ({
        id: step.index,
        name: step.name,
        description: step.description,
        input: step.input || null,
        output: step.output || null,
        errors: step.errors
          ? step.errors.map((e: WorkflowError) => ({
              code: e.code || 'unknown',
              name: e.name,
              message: e.message,
              stack: e.stack,
            }))
          : [],
        state: step.state,
        start: step.startedAt,
        end: step.endedAt,
        duration: step.duration,
      })),
    }

    const path = join(ctx.config.output, 'reports')
    ensureDirSync(path)
    writeJsonSync(join(path, `${ctx.name}-${ctx.hash}-results.json`), report, {spaces: 2})
  })

  /**const failed = steps.filter((step) => step.errors && step.errors.length > 0 && !step.output)
  const succeeded = steps.filter((step) => step.state === PipelineState.Completed)
  const skipped = steps.filter((step) => step.state === PipelineState.Skipped)
  const duration = getDurationString(context.duration!)

  if (context.state === PipelineState.Failed) {
    message = `workflow "${context.name}" failed, id: ${context.id}.`
    log(message, 'error', context)
  }

  message = `executed ${steps.length} steps, ${succeeded.length} succeeded, ${failed.length} failed and ${skipped.length} skipped in ${duration}.`
  log(message, 'success', context)**/
}
