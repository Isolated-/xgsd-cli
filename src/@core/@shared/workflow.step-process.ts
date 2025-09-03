import _ = require('lodash')
import {PipelineState} from '../@types/pipeline.types'
import {retry, WrappedError} from './runner'
import * as ms from 'ms'
import {resolveStepData, resolveStepTemplates, resolveTemplate} from './runner.process'

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

process.on('message', async (msg: any) => {
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

  log(
    `(${name}) ${description || 'no description'} is running using ${config.runner}, timeout: ${ms(
      timeout,
    )}, retries: ${retries}, enabled: ${step.enabled ?? true}`,
    'status',
  )

  if (!step.enabled) {
    log(`(${step.name}) is currently disabled, skipping this step.`, 'info')
    return
  }

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

  // prepare
  let input = step.input
  let attempts = 0
  if (config.print?.input) {
    log(`${step.name} input data: ${input ? JSON.stringify(input) : 'no input'}`, 'info')
  }

  let errors: WrappedError[] = []
  // execute
  try {
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

    const endedAt = new Date().toISOString()
    const duration = new Date(endedAt).getTime() - new Date(startedAt).getTime()

    step.startedAt = startedAt
    step.endedAt = endedAt
    step.duration = duration
    step.output = result.data

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
