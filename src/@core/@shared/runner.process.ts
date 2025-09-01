import {join} from 'path'
import {PipelineStep, SourceData, FlexiblePipelineConfig, PipelineState} from '../@types/pipeline.types'
import {retry, WrappedError, timeout as withTimeout, runner} from './runner'
import {RetryAttempt} from './runner/retry.runner'
import {fork} from 'child_process'
import {v4} from 'uuid'
import ms = require('ms')

type ChildMessage =
  | {type: 'RUN'; id: string; data: SourceData; config: FlexiblePipelineConfig}
  | {type: 'LOG'; log: any}
  | {type: 'ATTEMPT'; attempt: number; next: number; error: WrappedError}
  | {type: 'RESULT'; result: any}
  | {type: 'ERROR'; error: string}

function logRetry(name: string, attempt: number, max: number, next: number, error: WrappedError) {
  log(`${name} - retry attempt ${attempt + 1}/${max}, next retry in ${ms(next)}, error: ${error.message}`, 'warn')
}

async function runStep(step: PipelineStep, input: SourceData, pipelineConfig: FlexiblePipelineConfig) {
  return new Promise<{step: any; fatal: boolean; errors: any[]}>((resolve, reject) => {
    const stepProcess = fork(join(__dirname, 'runner.step-process.js'))

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
          resolve({step: msg.result, fatal: false, errors})
          break
        case 'ERROR':
          stepProcess.kill()
          resolve({step: step, fatal: true, errors: [msg.error]})
          break
      }
    })

    stepProcess.send({
      type: 'RUN',
      data: input,
      step,
      config: {...pipelineConfig, step},
    })
  })
}

// this should do as little as possible
// to prevent the chance of errors
process.on('message', async (context: ChildMessage) => {
  if (context.type !== 'RUN') return
  let pipelineStartMs = performance.now()

  const {data, config} = context
  const {timeout, retries} = config.options

  log(
    `${config.name} (${config.version || 'unversioned'}) is running using runner "${config.runner}" in ${
      config.mode
    } mode, timeout: ${timeout}, retries: ${retries}.`,
    'status',
  )

  let completedSteps: PipelineStep[] = []
  let input = data

  if (config.mode === 'async') {
    // Run all steps in parallel
    const stepResults = await Promise.all(config.steps.map((step) => runStep(step, data, config)))
    completedSteps.push(...stepResults.filter(Boolean).map((r) => r.step))
  }

  if (config.mode !== 'async') {
    for (const step of config.steps) {
      step.input = input

      const result = await runStep(step, input, config)

      if (config.mode === 'chained') input = result.step?.output || input

      if (!result.step && !result.errors) {
        continue
      }

      completedSteps.push({
        ...result.step,
        errors: result.errors.map((error) => {
          const {original, ...err} = error
          return err
        }),
      })
    }
  }

  const failed = completedSteps.filter((step) => step.errors!.length > 0 && !step.output)
  const skipped = completedSteps.filter((step) => step.state === PipelineState.Skipped)
  const succeeded = completedSteps.length - (failed.length + skipped.length)

  log(`the run id for ${config.name} is ${context.id}`, 'info')
  log(`logs and results if collected will be saved to ${config.output}`, 'info')
  log(`the duration in your report may be slightly different to below`, 'info')

  log(
    `executed ${config.steps.length} steps, ${succeeded} succeeded, ${failed.length} failed and ${
      skipped.length
    } skipped, duration: ${ms(Math.ceil(performance.now() - pipelineStartMs))}`,
    'status',
  )

  process.send!({
    type: 'RESULT',
    result: {
      config,
      steps: completedSteps,
    },
  })
})

const log = (message: string, level: 'info' | 'status' | 'retry' | 'success' | 'warn' | 'error' = 'info') => {
  process.send!({type: 'LOG', log: {level, message}})
}
