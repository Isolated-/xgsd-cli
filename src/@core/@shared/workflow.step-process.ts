import _ = require('lodash')
import {PipelineState, PipelineStep} from '../@types/pipeline.types'
import {retry, WrappedError} from './runner'
import * as ms from 'ms'
import {resolveStepData, resolveStepTemplates, resolveTemplate} from './runner.process'
import {WorkflowContext} from './context.builder'
import {RetryAttempt} from './runner/retry.runner'

const log = (message: string, level: string = 'info') => {
  dispatchMessage('log', {log: {level, message}}, true)
}

const fatal = (message: string) => {
  log(message, 'error')

  dispatchMessage('error', {
    name: 'Fatal Error',
    message: message,
    fatal: true,
  })
}

function dispatchMessage(type: 'error' | 'result' | 'attempt' | 'log', payload: any, child: boolean = false) {
  process.send!({
    type: `CHILD:${type.toUpperCase()}`,
    ...payload,
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

  const errors: WrappedError[] = []
  const result = await retry(prepared.input, step.fn!, retries, {
    timeout,
    delay,
    onAttempt: async (a) => {
      attempt?.(a)
      prepared.state = PipelineState.Retrying
      prepared.attempt = a.attempt + 1
      errors.push(a.error)
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
    throw new Error('FUNCTION_NOT_FOUND')
  }

  return fn
}

// this method now just deals with logging back up stream
process.on('message', async (msg: {type: string; step: PipelineStep; context: WorkflowContext}) => {
  if (msg.type !== 'START') return

  const {step, context} = msg

  let fn
  try {
    fn = await importUserModule(step, context)
  } catch (error: any) {
    fatal(`failed to load user module for step: ${step.name}, error: ${error.message}`)
    return
  }

  log(
    `(${step.name}) ${step.description || 'no description'} is running using ${context.config.runner}, timeout: ${
      step.options?.timeout ?? context.config.options.timeout
    }, retries: ${step.options?.retries ?? context.config.options.retries}, enabled: ${step.enabled ?? true}`,
    'status',
  )

  const delay = (attempt: number) => 1000 * 2 ** attempt
  const onAttempt = async (attempt: RetryAttempt) => {
    // log the attempt
    log(
      `${step.name || 'no name'} is currently failing, attempt: ${attempt.attempt + 1}/${
        step.options?.retries
      }, next retry in: ${ms(attempt.nextMs)}`,
      'warn',
    )

    log(`${step.name} failing with error: ${attempt.error.message}`, 'warn')
    dispatchMessage('attempt', attempt)
  }

  step.fn = fn
  const result = await processStep(step, context, delay, onAttempt)

  if (result.errors && result.errors.length !== 0) {
    log(`(${step.name}) failed with error: ${result.errors[0].message}`, 'error')
  }

  log(`(${step.name}) step ${result.state}, took ${ms(result.duration as number)}`, 'info')

  if (context.config.print?.output) {
    log(`${step.name} output data: ${result.output ? JSON.stringify(result.output) : 'no output'}`, 'info')
  }

  dispatchMessage('result', {result: {step: result}})
})

// give me a minute on suggestions please
process.on('message_old', async (msg: any) => {
  if (msg.type !== 'START') return

  const {step, context} = msg
  const config = context.config

  const startedAt = new Date().toISOString()
  const name = step.name ?? 'no name'
  const description = step.description ?? 'no description'
  let timeout = step.options?.timeout || config.options?.timeout
  const retries = step.options?.retries || config.options?.retries

  if (typeof timeout === 'string') {
    timeout = ms(timeout as ms.StringValue)
  }

  // move logging outside of the process (emit state events instead)
  log(
    `(${name}) ${description || 'no description'} is running using ${config.runner}, timeout: ${ms(
      timeout,
    )}, retries: ${retries}, enabled: ${step.enabled ?? true}`,
    'status',
  )

  // skip if not enabled (move to a diff function)
  if (!step.enabled) {
    log(`(${step.name}) is currently disabled, skipping this step.`, 'info')
    // this is also broken -> the step.state is not being updated and the process never gets a result
    return
  }

  // move this and step.enabled into shouldRun()
  if (step.if === false) {
    const condition = config.steps[step.index].if.replace(/\${{(.*?)}}/g, '$1').trim()

    log(`(${step.name}) condition "if" is false, skipping this step. ("${condition}")`, 'info')

    process.send!({
      type: 'CHILD:RESULT',
      result: {
        step: {
          ...step,
          state: PipelineState.Skipped,
        },
      },
    })
    return
  }

  // this becomes loadUserModule(), returning the loaded module
  // or error code (0 = unable to load package, 1 = missing function)
  let userModule
  try {
    userModule = await import(config.package!)
  } catch (error: any) {
    fatal(`failed to load package: ${config.package}, error: ${error.message}`)
    return
  }

  // step.run = step.action and vice versa
  // this becomes part of loadUserModule
  const fn = userModule[step.run]
  if (!fn) {
    fatal(`missing function implementation for: ${step.run}`)
    return
  }

  // prepare
  // processStep
  let input = step.input
  let attempts = 0
  if (config.print?.input) {
    log(`${step.name} input data: ${input ? JSON.stringify(input) : 'no input'}`, 'info')
  }

  let errors: WrappedError[] = []
  // execute
  try {
    // processStep() clean up attempt handling too
    const result = await retry(input, fn, retries, {
      timeout,
      delay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
      onAttempt: (attempt) => {
        attempts++
        errors.push(attempt.error)
        log(
          `(${step.name || 'no name'}) currently failing, attempt: ${
            attempt.attempt + 1
          }/${retries}, next retry in: ${ms(attempt.nextMs)}`,
          'info',
        )
        //process.send!({type: 'ATTEMPT', attempt: attempt.attempt, next: attempt.nextMs, error: attempt.error})
      },
    })

    // all part of processStep
    const endedAt = new Date().toISOString()
    const duration = new Date(endedAt).getTime() - new Date(startedAt).getTime()

    step.startedAt = startedAt
    step.endedAt = endedAt
    step.duration = duration
    step.output = result.data

    // this horrible mess of sending results can also be simplified into processStep
    // then this handler simply acts as a dumb IPC messenger

    if (!result.data && result.error) {
      log(
        `(${step.name || 'no name'}) failed after ${attempts} attempts, error: ${result.error.message} (${
          result.error.name
        })`,
        'error',
      )

      process.send!({
        type: 'CHILD:RESULT',
        result: {
          step: {
            ...step,
            errors,
            state: PipelineState.Failed,
          },
        },
      })
      return
    }

    if (step.after) {
      const resolved = resolveStepData(step.after, {...context, ...step, output: step.output})
      if (resolved) {
        step.after = resolved
        step.output = resolved
      }
    }

    if (config.print?.output) {
      log(`${step.name} output data: ${step.output ? JSON.stringify(step.output) : 'no output'}`, 'info')
    }

    log(`${step.name} - step completed successfully`, 'success')
    process.send!({
      type: 'CHILD:RESULT',
      result: {
        state: PipelineState.Completed,
        step: {
          ...step,
          errors,
        },
      },
    })
  } catch (error) {
    fatal(`error occurred while executing step: ${step.name}, error: ${JSON.stringify(error)}`)
  }
})
