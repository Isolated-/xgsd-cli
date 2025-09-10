import {PipelineState, PipelineStep} from '../@types/pipeline.types'
import {retry, WrappedError} from './runner'
import {resolveStepData, resolveStepTemplates, resolveTemplate} from './runner.process'
import {WorkflowContext} from './context.builder'
import {RetryAttempt} from './runner/retry.runner'
import {WorkflowEvent} from '../workflows/workflow.events'
import {deepmerge2, isEmptyObject, merge} from '../util/object.util'
import {WorkflowError, WorkflowErrorCode} from './workflow.error'
import {getBackoffStrategy} from './workflow-backoff.strategies'
import {defaultWith, delayFor} from '../util/misc.util'
import ms = require('ms')
import {getDurationNumber} from '../pipelines/pipelines.util'

export const DATA_SIZE_LIMIT_KB = 512 // 512 KB

export const log = (message: string, level: string = 'info') => {
  dispatchMessage('log', {log: {level, message, timestamp: new Date().toISOString()}}, true)
}

export const dataSizeRegulator = <T = unknown>(data: T, kb: number = DATA_SIZE_LIMIT_KB): T => {
  if (!data) return data

  const jsonData = JSON.stringify(data || '')
  const bufLength = Buffer.byteLength(jsonData, 'utf-8')
  if (bufLength > kb * 1024) {
    throw new WorkflowError(`Step output exceeds ${kb} KB limit`, WorkflowErrorCode.HardDataSize)
  }

  return data
}

export function getStepDelay(stepCount: number): number {
  if (stepCount <= 0) return 0

  const base = 100 // ms max delay
  const min = 10 // ms minimum delay floor

  // Scale down with log — more steps = smaller delay
  const delay = base / Math.log2(stepCount + 1)

  // Clamp so we never go below min
  return Math.max(min, Math.round(delay))
}

function dispatchMessage(
  type: 'error' | 'start' | 'result' | 'attempt' | 'log' | 'event',
  payload: any,
  child: boolean = false,
) {
  process.send!({
    type: `CHILD:${type.toUpperCase()}`,
    ...payload,
  })
}

export const event = (
  name: string,
  context: {
    attempt?: RetryAttempt
    error?: WrappedError
    step: PipelineStep
    context?: WorkflowContext
    [key: string]: any
  },
) => {
  process.send!({
    type: 'CHILD:EVENT',
    event: name,
    payload: context,
  })
}

/**
 *  Process a single step in the workflow
 *  This function is responsible for executing the step's logic and updating its state.
 *  It should return the updated step. And use resolveStepData exactly twice (before and after)
 */
export async function processStep(
  step: PipelineStep<any>,
  context: WorkflowContext<any>,
  delay?: (attempt: number) => number,
  attempt?: (attempt: RetryAttempt) => Promise<any>,
  event?: (name: string, payload: any) => void,
) {
  const prepared = prepareStepData(step, context)
  prepared.startedAt = new Date().toISOString()

  // by this point if/enabled are booleans
  // not undefined/null
  if (!shouldRun(prepared)) {
    prepared.state = PipelineState.Skipped
    return prepared
  }

  console.log(prepared)

  event?.(WorkflowEvent.StepStarted, {step: prepared})

  const options = merge(context.config.options, step.options) as {retries: number; timeout: number}

  prepared.state = PipelineState.Running
  const retries = options.retries!
  const timeout = options.timeout!

  if (step.options?.delay && step.options.delay !== '0s' && step.options.delay !== 0) {
    const delayMs = getDurationNumber(step.options.delay as string) || 0
    event?.(WorkflowEvent.StepWaiting, {step, delayMs})
    await delayFor(delayMs || 0)
  }

  prepared.errors = []
  const result = await retry(prepared.data, step.fn!, retries, {
    timeout,
    delay,
    onAttempt: async (a) => {
      attempt?.(a)
      prepared.state = PipelineState.Retrying
      prepared.attempt = a.attempt + 1
      prepared.errors.push(a.error) // this can be removed in v0.4+ (streaming to logs is implemented)
    },
  })

  let data
  try {
    data = dataSizeRegulator(result.data)
  } catch (error) {
    prepared.error = error
    prepared.errors!.push(error as WorkflowError)
    prepared.state = PipelineState.Failed
    prepared.endedAt = new Date().toISOString()
    prepared.duration = Date.parse(prepared.endedAt) - Date.parse(prepared.startedAt)
    const finalData = finaliseStepData(prepared, context)
    event?.(WorkflowEvent.StepCompleted, {step: finalData})
    return finalData
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

  prepared.fn = undefined
  prepared.output = (output as Record<string, any>) || {}
  prepared.error = result.error
  prepared.options = {retries, timeout}
  prepared.state = result.error ? PipelineState.Failed : PipelineState.Completed
  prepared.endedAt = new Date().toISOString()
  prepared.duration = Date.parse(prepared.endedAt) - Date.parse(prepared.startedAt)

  const finalData = finaliseStepData(prepared, context)

  event?.(WorkflowEvent.StepCompleted, {step: finalData})

  return finalData
}

export function shouldRun(step: PipelineStep): boolean {
  if (step.if !== false && step.enabled !== false) {
    return true
  }

  return false
}

export function finaliseStepData(step: PipelineStep, context: WorkflowContext) {
  if (isEmptyObject(step.after)) {
    return step
  }

  step.after = resolveStepData(step.after, {
    ...context,
    step: step,
    data: step.input,
    output: step.output,
  })

  if (!isEmptyObject(step.after) && step.output) {
    step.output = step.after
    step.after = undefined
  }

  return step
}

export function prepareStepData(step: PipelineStep, context: WorkflowContext) {
  const {after, ...stepData} = step
  const data = deepmerge2(deepmerge2(context.config.data, step.data), step.input)
  const resolved = resolveStepData(step, {
    ...context,
    step: stepData,
    data,
  })

  resolved.data = data
  resolved.input = deepmerge2(data, resolved.with)
  resolved.after = after

  return resolved
}

export async function importUserModule(step: PipelineStep, context: WorkflowContext) {
  try {
    const action = step.run || step.action!
    const fn = require(context.package)[action]
    return fn
  } catch (error: any) {
    throw new WorkflowError(
      `${context.package} couldn't be loaded. This could mean it wasn't found, or there's an error preventing its load. Check logs for more information. (${error.message})`,
      WorkflowErrorCode.ModuleNotFound,
    )
  }
}

export const rejectionHandler = (step: PipelineStep) => {
  const handler = (errorOrRejection: any) => {
    const error = errorOrRejection instanceof Error ? errorOrRejection : null
    const wrapped = new WorkflowError(
      error?.message || String(errorOrRejection || 'Unhandled Exception'),
      WorkflowErrorCode.FatalError,
    ) as WrappedError

    const result = {
      step: {
        ...step,
        state: PipelineState.Failed,
        error: wrapped,
        errors: [...(step.errors || []), wrapped],
      },
    }

    event(WorkflowEvent.StepCompleted, {step: result.step as any})
    dispatchMessage('result', {result})
  }

  process.on('uncaughtException', handler)
  process.on('unhandledRejection', handler)
}

// this method now just deals with logging back up stream
process.on('message', async (msg: {type: string; step: PipelineStep; context: WorkflowContext}) => {
  if (msg.type !== 'START') return

  const {step, context} = msg

  rejectionHandler(step)

  const fn = await importUserModule(step, context)

  const method = defaultWith('exponential', step.options?.backoff, context.config.options?.backoff)!
  const delay = getBackoffStrategy(method)
  const onAttempt = async (attempt: RetryAttempt) => {
    event(WorkflowEvent.StepRetry, {attempt, step})
    //event(WorkflowEvent.StepError, {error: attempt.error, step})
  }

  step.fn = fn
  const result = await processStep(step, context, delay, onAttempt, event)

  // v0.4.0 - allow some time for messages to be sent before exiting
  // also prevents issues with very fast steps
  // placing it here won't affect step timing
  const nextStepDelayMs = getStepDelay(context.steps.length)
  await delayFor(nextStepDelayMs)

  dispatchMessage('result', {result: {step: result}})
})
