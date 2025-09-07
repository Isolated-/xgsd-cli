import {PipelineState, PipelineStep} from '../@types/pipeline.types'
import {retry, WrappedError} from './runner'
import {resolveStepData, resolveStepTemplates, resolveTemplate} from './runner.process'
import {WorkflowContext} from './context.builder'
import {RetryAttempt} from './runner/retry.runner'
import {WorkflowEvent} from '../workflows/workflow.events'
import {deepmerge2, isEmptyObject, merge} from '../util/object.util'
import {WorkflowError, WorkflowErrorCode} from './workflow.error'
import {getBackoffStrategy} from './workflow-backoff.strategies'
import {defaultWith} from '../util/misc.util'

export const log = (message: string, level: string = 'info') => {
  dispatchMessage('log', {log: {level, message, timestamp: new Date().toISOString()}}, true)
}

const fatal = (message: string) => {
  log(message, 'error')

  dispatchMessage('error', {
    name: 'Fatal Error',
    message: message,
    fatal: true,
  })
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
  step: PipelineStep,
  context: WorkflowContext,
  delay?: (attempt: number) => number,
  attempt?: (attempt: RetryAttempt) => Promise<any>,
) {
  const prepared = prepareStepData(step, context)
  prepared.startedAt = new Date().toISOString()

  // by this point if/enabled are booleans
  // not undefined/null
  if (!shouldRun(prepared)) {
    prepared.state = PipelineState.Skipped
    return prepared
  }

  const options = merge(context.config.options, step.options) as {retries: number; timeout: number}

  prepared.state = PipelineState.Running
  const retries = options.retries!
  const timeout = options.timeout!

  event(WorkflowEvent.StepStarted, {step: prepared})

  prepared.errors = []
  const result = await retry(prepared.input, step.fn!, retries, {
    timeout,
    delay,
    onAttempt: async (a) => {
      attempt?.(a)
      prepared.state = PipelineState.Retrying
      prepared.attempt = a.attempt + 1
      prepared.errors.push(a.error) // this can be removed in v0.4+ (streaming to logs is implemented)
    },
  })

  let output = result.data

  if (
    typeof output === 'number' ||
    typeof output === 'string' ||
    typeof output === 'boolean' ||
    Array.isArray(output)
  ) {
    output = {data: output}
  }

  prepared.fn = undefined
  prepared.output = output as Record<string, any>
  prepared.options = {retries, timeout}
  prepared.state = result.error ? PipelineState.Failed : PipelineState.Completed
  prepared.endedAt = new Date().toISOString()
  prepared.duration = Date.parse(prepared.endedAt) - Date.parse(prepared.startedAt)

  return finaliseStepData(prepared, context)
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

  step.errors = step.errors || []
  step.error = step.errors[0] ?? null

  return step
}

export function prepareStepData(step: PipelineStep, context: WorkflowContext) {
  const {after, ...stepData} = step
  const data = deepmerge2(context.config.data, step.data)
  const resolved = resolveStepData(step, {
    ...context,
    step: stepData,
    data,
  })

  resolved.input = deepmerge2(data, resolved.with)
  resolved.after = after

  return resolved
}

export async function importUserModule(step: PipelineStep, context: WorkflowContext) {
  let userModule
  try {
    userModule = await import(context.package)
  } catch (error: any) {
    throw new Error('MODULE_NOT_FOUND')
  }

  // step.run = step.action and vice versa
  // this becomes part of loadUserModule
  const action = step.run ?? step.action!
  const fn = userModule[action]
  if (!fn) {
    throw new WorkflowError(`${action} function not found in module`, WorkflowErrorCode.FunctionNotFound)
  }

  return fn
}

process.on('uncaughtException', (error) => {
  fatal(`uncaught exception: ${error.message}`)
  process.exit(1) // <- fixes memory leak on uncaught exceptions
})

process.on('unhandledRejection', (reason: any, promise) => {
  fatal(`unhandled rejection: ${reason?.message || reason}`)
  process.exit(1) // <- fixes memory leak on unhandled rejections
})

// this method now just deals with logging back up stream
process.on('message', async (msg: {type: string; step: PipelineStep; context: WorkflowContext}) => {
  if (msg.type !== 'START') return

  const {step, context} = msg

  let fn
  try {
    fn = await importUserModule(step, context)
  } catch (error: any) {}

  const method = defaultWith('exponential', step.options?.backoff, context.config.options?.backoff)!
  const delay = getBackoffStrategy(method)
  const onAttempt = async (attempt: RetryAttempt) => {
    event(WorkflowEvent.StepRetry, {attempt, step})
    event(WorkflowEvent.StepError, {error: attempt.error, step})
  }

  step.fn = fn
  const result = await processStep(step, context, delay, onAttempt)

  event(WorkflowEvent.StepCompleted, {step: result})
  dispatchMessage('result', {result: {step: result}})
})
