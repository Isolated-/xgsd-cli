import _ = require('lodash')
import {PipelineState} from '../@types/pipeline.types'
import {retry, WrappedError} from './runner'
import * as ms from 'ms'
import {resolveStepData, resolveStepTemplates, resolveTemplate} from './runner.process'

const log = (message: string, level: string = 'log') => {
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
    type: `${type.toUpperCase()}`,
    ...payload,
  })
}

process.on('message', async (msg: any) => {
  console.log('started')
  if (msg.type !== 'START') return

  const {type, ...context} = msg
  //console.dir(context, {depth: null, colors: true})

  const {step, config} = context
  const startedAt = new Date().toISOString()
  const name = step.name ?? 'no name'
  const description = step.description ?? 'no description'
  let timeout = step.options?.timeout || config.options?.timeout
  const retries = step.options?.retries || config.options?.retries

  if (typeof timeout === 'string') {
    timeout = ms(timeout as ms.StringValue)
  }

  log(
    `${name} - ${description} is running using ${config.runner}, timeout: ${ms(
      timeout,
    )}, retries: ${retries}, enabled: ${step.enabled ?? true}`,
    'status',
  )

  if (!step.enabled) {
    log(`${step.name} is currently disabled, skipping this step.`, 'warn')
    return
  }

  let userModule
  try {
    userModule = await import(config.package!)
  } catch (error: any) {
    fatal(`failed to load package: ${config.package}, error: ${error.message}`)
    return
  }

  // step.run = step.action and vice versa
  const fn = userModule[step.run]
  if (!fn) {
    fatal(`missing function implementation for: ${step.run}`)
    return
  }

  let input = step.data ?? context.data
  let attempts = 0
  if (config.print?.input) {
    log(`${step.name} input data: ${input ? JSON.stringify(input) : 'no input'}`, 'success')
  }

  // execute
  try {
    const result = await retry(input, fn, retries, {
      timeout,
      delay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
      onAttempt: (attempt) => {
        attempts++
        log(`${step.name} - attempt ${attempt.attempt} failed, retrying in ${attempt.nextMs}ms`, 'warn')
        process.send!({type: 'ATTEMPT', attempt: attempt.attempt, next: attempt.nextMs, error: attempt.error})
      },
    })

    if (!result.data && result.error) {
      log(`${step.name} - error occurred while executing step: ${step.name}, error: ${result.error.message}`, 'error')

      process.send!({type: 'RESULT', step: null, error: result.error})
      return
    }

    const endedAt = new Date().toISOString()
    const duration = new Date(endedAt).getTime() - new Date(startedAt).getTime()

    step.output = result.data

    if (step.after) {
      const resolved = resolveStepData(step.after, {...context, ...step, output: step.output})
      if (resolved) {
        step.after = resolved
        step.output = resolved
      }
    }

    if (config.print?.output) {
      log(`${step.name} output data: ${step.output ? JSON.stringify(step.output) : 'no output'}`, 'success')
    }

    log(`${step.name} - step completed successfully`, 'success')
    process.send!({
      type: 'RESULT',
      result: {
        errors: [],
        state: PipelineState.Completed,
        ...step,
      },
    })
  } catch (error) {
    fatal(`error occurred while executing step: ${step.name}, error: ${JSON.stringify(error)}`)
  }
})

process.on('message_old', async (msg: any) => {
  if (msg.type !== 'RUN') return
  const {data, step, config} = msg
  const {options} = config

  let startedAt = new Date().toISOString()

  const log = (message: string, level: string = 'log') => {
    //process.send!({type: 'LOG', log: {level, message}})
  }

  const description = step.description || 'no description'
  let timeout = step.options?.timeout || options.timeout
  const retries = step.options?.retries || options.retries

  if (typeof timeout === 'string') {
    timeout = ms(timeout as ms.StringValue)
  }

  log(
    `${step.name} - ${description} is running using ${config.runner}, timeout: ${ms(
      timeout,
    )}, retries: ${retries}, enabled: ${step.enabled ?? true}`,
    'status',
  )

  let userModule
  try {
    userModule = await import(config.package!)
  } catch (error: any) {
    log(`failed to load package: ${config.package}, error: ${error.message}`, 'error')
    process.send!({
      type: 'ERROR',
      error: {
        name: 'Package Load Failure',
        message: `failed to load package: ${config.package}, error: ${error.message}`,
        stack: error.stack,
        fatal: true,
      },
    })
    return
  }

  const fn = userModule[step.action || step.run]
  if (!fn) {
    log(`${step.name} is missing function implementation for: ${step.action}`, 'error')
    process.send!({
      type: 'ERROR',
      error: {
        name: 'Function Load Failure',
        message: `missing function implementation for: ${step.action}`,
        fatal: true,
      },
    })
    return
  }

  let totalRetries = 0
  let errors: WrappedError[] = []
  const input = step.input ?? data

  if (config.print?.input) {
    log(`${step.name} input data: ${input ? JSON.stringify(input) : 'no input'}`, 'success')
  }

  if (step.if === false) {
    log(`${step.name} is conditionally skipped (if: false)`, 'warn')
    process.send!({
      type: 'RESULT',
      result: {
        errors: [],
        state: PipelineState.Skipped,
        ...step,
      },
    })
    return
  }

  if (step.enabled === false) {
    log(`${step.name} is currently disabled, skipping this step.`, 'warn')
    process.send!({
      type: 'RESULT',
      result: {
        errors: [],
        state: PipelineState.Skipped,
        ...step,
      },
    })
    return
  }

  try {
    log(`${step.name} - executing step`, 'status')
    const result = await retry(input, fn, retries, {
      timeout,
      delay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
      onAttempt: (attempt) => {
        totalRetries++
        errors.push({
          name: attempt.error.name || '',
          message: attempt.error.message,
          stack: attempt.error.stack,
        } as WrappedError)
        process.send!({type: 'ATTEMPT', attempt: attempt.attempt, next: attempt.nextMs, error: attempt.error})
      },
    })

    log(
      `${step.name} - step completed ${result.error ? 'with errors' : 'successfully'} in ${totalRetries} attempts ${
        result.error ? `error: ${result.error.message}` : ''
      }`,
      result.error ? 'error' : 'success',
    )

    const formattedResult = {
      name: step.name || '',
      description: step.description || '',
      state: result.error ? PipelineState.Failed : PipelineState.Completed,
      input: input ?? null,
      output: result.data ?? null,
      after: undefined,
      max: retries,
      attempt: totalRetries,
      error: errors[0] ?? null,
      errors,
      duration: new Date().getTime() - new Date(startedAt).getTime(),
      startedAt,
      endedAt: new Date().toISOString(),
    }

    if (config.print?.output) {
      log(`${step.name} output data: ${result.data ? JSON.stringify(result.data) : 'no output'}`, 'success')
    }

    process.send!({type: 'RESULT', result: formattedResult})
  } catch (error) {
    process.send!({type: 'RESULT', result: null, error: error})
  }
})
