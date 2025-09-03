import {join} from 'path'
import {PipelineStep, SourceData, FlexibleWorkflowConfig, PipelineState} from '../@types/pipeline.types'
import {retry, WrappedError, timeout as withTimeout, runner} from './runner'
import {RetryAttempt} from './runner/retry.runner'
import {fork} from 'child_process'
import {v4} from 'uuid'
import ms = require('ms')
import _ = require('lodash')
import {HelperFn, helpers} from './workflow.helpers'
import {error} from 'console'

export function callHelper(helperName: string, value: any, ...args: any[]) {
  const fn: HelperFn | undefined = helpers[helperName]
  if (!fn) throw new Error(`Helper "${helperName}" not found`)
  return fn(value, ...args)
}

export function isNumberString(str: string) {
  return isNaN(Number(str)) === false
}

// Resolve a single template string, e.g., "{{ .input.user.name | upper }}"
export function resolveTemplate(template: string, context: any): any {
  const regex = /{{\s*(.+?)\s*}}/
  const match = regex.exec(template)
  if (!match) return template

  let expr = match[1] // e.g., ".input.user | json | hash | slice(0, 8)"

  // Split path vs filters
  const [pathStr, ...filterParts] = expr.split('|').map((s) => s.trim())

  // Convert .steps[0].output.data -> ['steps','0','output','data']
  const pathArray = pathStr
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)

  let value = getNestedValue(context, pathArray)

  // Apply all filters sequentially
  for (const filterExpr of filterParts) {
    // Check if filter has arguments: slice(0, 8)
    const argMatch = /^(\w+)\((.*)\)$/.exec(filterExpr)
    if (argMatch) {
      const [, helperName, argsStr] = argMatch
      const args = argsStr
        .split(',')
        .map((s) => s.trim())
        .map((s) => {
          const pathArray = s
            .replace(/\[(\d+)\]/g, '.$1')
            .split('.')
            .filter(Boolean)

          // resolve value
          const resolvedValue = getNestedValue(context, pathArray)
          if (isNumberString(resolvedValue)) {
            return resolvedValue
          }

          if (Array.isArray(resolvedValue) || typeof resolvedValue === 'object') {
            return resolvedValue
          }

          if (typeof resolvedValue === 'string') {
            return resolvedValue.replace(/^['"]|['"]$/g, '')
          }

          return resolvedValue
        })
      value = callHelper(helperName, value, ...args)
    } else {
      value = callHelper(filterExpr, value)
    }
  }

  return value
}

// utils.ts
export function getNestedValue(obj: any, pathArray: string[]): any {
  if (pathArray.length === 1 && typeof pathArray[0] === 'string' && !obj[pathArray[0]]) {
    if (isNumberString(pathArray[0])) {
      return parseInt(pathArray[0])
    }

    return pathArray[0].replace(/^["]|["]$/g, '')
  }

  return pathArray.reduce((acc, key) => (acc ? acc[key] : undefined), obj)
}

export function resolveStepData(obj: any, context: any): any {
  if (typeof obj === 'string') {
    return resolveTemplate(obj, context)
  }

  if (Array.isArray(obj)) {
    return obj.map((v) => resolveStepData(v, context))
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: any = {}
    for (const key in obj) {
      result[key] = resolveStepData(obj[key], context)
    }
    return result
  }

  return obj // leave numbers, booleans, null, etc. intact
}

export function resolveStepTemplates(step: any, workflow: any) {
  // Context includes all previous steps, plus current step input
  const context = {
    ...workflow,
    output: step.output || {},
    steps: workflow.steps.map((s: any) => ({
      input: s.input,
      output: s.output,
      data: s.data,
    })),
  }

  // Resolve all fields in step (or step.with)
  step = resolveStepData(step, context)

  return step
}

type ChildMessage =
  | {type: 'RUN'; id: string; data: SourceData; config: FlexibleWorkflowConfig}
  | {type: 'LOG'; log: any}
  | {type: 'ATTEMPT'; attempt: number; next: number; error: WrappedError}
  | {type: 'RESULT'; result: any}
  | {type: 'ERROR'; error: string}

function logRetry(name: string, attempt: number, max: number, next: number, error: WrappedError) {
  log(`${name} - retry attempt ${attempt + 1}/${max}, ntrueext retry in ${ms(next)}, error: ${error.message}`, 'warn')
}

async function runStep(step: PipelineStep, input: SourceData, pipelineConfig: FlexibleWorkflowConfig) {
  return new Promise<{step: any; fatal: boolean; errors: any[]}>((resolve, reject) => {
    const stepProcess = fork(join(__dirname, 'runner.step-process.js'))

    const {after, ...data} = step
    const preresolve = resolveStepTemplates(data, pipelineConfig)

    if (step.state !== PipelineState.Pending) return

    let errors: WrappedError[] = []
    stepProcess.on('message', (msg: any) => {
      switch (msg.type) {
        case 'LOG':
          process.send!({type: 'LOG', log: msg.log})
          break
        case 'ATTEMPT':
          const next = Math.ceil(msg.next / 1000)

          logRetry(step.name!, msg.attempt, step.options?.retries || pipelineConfig.options.retries!, next, msg.error)

          errors.push(msg.error)
          break
        case 'RESULT':
          stepProcess.kill()
          resolve({step: msg.result, fatal: false, errors})
          break
        case 'ERROR':
          stepProcess.kill()
          resolve({step: null, fatal: true, errors})
          break
      }
    })

    stepProcess.send({
      type: 'START',
      data: input,
      step: {
        ...preresolve,
        after,
      },
      config: pipelineConfig,
    })
  })
}

// this should do as little as possible
// to prevent the chance of errors
process.on('message', async (context: ChildMessage) => {
  if (context.type !== 'RUN') return
  let pipelineStartMs = performance.now()

  log(`runner process came alive`)

  try {
    const {data, config} = context
    const {timeout, retries} = config.options

    log(
      `${config.name} (${config.version || 'unversioned'}) is running using runner "${config.runner}" in ${
        config.mode
      } mode, timeout: ${timeout}, retries: ${retries}.`,
      'status',
    )

    let completedSteps: PipelineStep[] = []
    let input = _.merge({}, config.data, data)

    if (config.mode === 'async') {
      // Run all steps in parallel
      const stepResults = await Promise.all(
        config.steps.map((step) => {
          return runStep(step, input, config)
        }),
      )
      completedSteps.push(
        ...stepResults.filter(Boolean).map((r) =>
          resolveStepTemplates(r.step, {
            steps: stepResults,
            input: r.step?.input,
            output: r.step?.output,
          }),
        ),
      )
    }

    if (config.mode !== 'async') {
      let idx = 0
      for (const step of config.steps) {
        if (step.state) continue

        step.state = PipelineState.Pending

        step.input = resolveStepData(input, {...config, steps: completedSteps})

        const result = await runStep(step, input, config)

        if (config.mode === 'chained') input = result.step?.output || step.input

        if (!result.step && !result.errors) {
          continue
        }

        completedSteps.push(result.step)
      }
    }

    //const failed = completedSteps.filter((step) => step.errors && step.errors.length > 0 && !step.output)
    //const skipped = completedSteps.filter((step) => step.state === PipelineState.Skipped)
    //const succeeded = completedSteps.length - (failed.length + skipped.length)

    log(`the run id for ${config.name} is ${context.id}`, 'info')
    log(`logs and results if collected will be saved to ${config.output}`, 'info')
    log(`the duration in your report may be slightly different to below`, 'info')

    //log(
    //  `executed ${config.steps.length} steps, ${succeeded} succeeded, ${failed.length} failed and ${
    //    skipped.length
    //  } skipped, duration: ${ms(Math.ceil(performance.now() - pipelineStartMs))}`,
    //  'status',
    //)

    process.send!({
      type: 'PARENT:RESULT',
      result: {
        config,
        steps: completedSteps,
      },
    })
  } catch (error) {
    console.log(error)
    // safety net
    //process.send!({type: 'ERROR', error})
  }
})

const log = (message: string, level: 'info' | 'status' | 'retry' | 'success' | 'warn' | 'error' = 'info') => {
  process.send!({type: 'PARENT:LOG', log: {level, message}})
}
