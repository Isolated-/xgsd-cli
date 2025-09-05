import _ = require('lodash')
import {PipelineState, PipelineStep} from '../@types/pipeline.types'
import {retry, WrappedError} from './runner'
import {resolveStepData, resolveStepTemplates, resolveTemplate} from './runner.process'
import {WorkflowContext} from './context.builder'
import {RetryAttempt} from './runner/retry.runner'
import {WorkflowEvent} from '../workflows/workflow.events'
import {WorkflowError, WorkflowErrorCode} from './workflow.process'

const log = (message: string, level: string = 'info') => {
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
  context: {attempt?: RetryAttempt; error?: WrappedError; step: PipelineStep; context: WorkflowContext},
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
  // by this point if/enabled are booleans
  // not undefined/null
  if (!shouldRun(prepared)) {
    prepared.state = PipelineState.Skipped
    return prepared
  }

  prepared.startedAt = new Date().toISOString()

  const options = _.merge(context.config.options, step.options)

  prepared.state = PipelineState.Running
  const retries = options.retries!
  const timeout = options.timeout!

  event(WorkflowEvent.StepRunning, {step: prepared, context})

  const errors: WrappedError[] = []
  const result = await retry(prepared.input, step.fn!, retries, {
    timeout,
    delay,
    onAttempt: async (a) => {
      attempt?.(a)
      prepared.state = PipelineState.Retrying
      prepared.attempt = a.attempt + 1
      errors.push(a.error) // this can be removed in v0.4+ (streaming to logs is implemented)
    },
  })

  prepared.fn = undefined
  prepared.output = result.data
  prepared.errors = errors
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
  if (_.isEmpty(step.after) || !step.after) {
    return step
  }

  step.after = resolveStepData(step.after, {
    ...context,
    step: step,
    data: step.input,
    output: step.output,
  })

  if (!_.isEmpty(step.after)) {
    step.output = step.after
    step.after = undefined
  }

  step.errors = step.errors || []
  step.error = step.errors[0] ?? null

  return step
}

export function prepareStepData(step: PipelineStep, context: WorkflowContext) {
  const {after, ...stepData} = step
  const resolved = resolveStepTemplates(step, {
    ...context,
    step: stepData,
    data: _.merge(context.config.data, step.data),
  })

  resolved.input = _.merge({}, context.config.data, resolved.data, resolved.with)
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
  } catch (error: any) {
    console.log(error)
    return
  }

  const delay = (attempt: number) => 1000 * 2 ** attempt
  const onAttempt = async (attempt: RetryAttempt) => {
    event(WorkflowEvent.StepRetry, {attempt, step, context})
    event(WorkflowEvent.StepError, {error: attempt.error, step, context})
  }

  event(WorkflowEvent.StepStarted, {step, context})
  step.fn = fn
  const result = await processStep(step, context, delay, onAttempt)

  if (result.errors && result.errors.length > 0 && !result.output) {
    event(WorkflowEvent.StepFailed, {step: result, context})
  } else {
    event(WorkflowEvent.StepCompleted, {step: result, context})
  }

  dispatchMessage('result', {result: {step: result}})
})
