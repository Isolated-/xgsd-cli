import {FlexibleWorkflowConfig, PipelineState, PipelineStep, SourceData} from '../@types/pipeline.types'
import {ParentMessage} from '../pipelines/pipeline.concrete'
import * as ms from 'ms'
import {WrappedError} from './runner'
import * as lodash from 'lodash'
import {resolveStepData, resolveStepTemplates} from './runner.process'
import {fork} from 'child_process'
import {WorkflowContext} from './context.builder'
import {join} from 'path'

const log = (message: string, level: 'info' | 'status' | 'retry' | 'success' | 'warn' | 'error' = 'info') => {
  process.send!({type: 'PARENT:LOG', log: {level, message, timestamp: new Date().toISOString()}})
}

const event = (name: string, payload: object) => {
  process.send!({type: 'PARENT:EVENT', event: name, payload})
}

async function runStep(idx: number, step: PipelineStep, context: WorkflowContext) {
  return new Promise<{step: any; fatal: boolean; errors: any[]}>((resolve, reject) => {
    const stepProcess = fork(join(__dirname, 'workflow.step-process.js'))

    let errors: WrappedError[] = []
    stepProcess.on('message', (msg: any) => {
      switch (msg.type) {
        case 'CHILD:LOG':
          process.send!({type: 'PARENT:LOG', log: msg.log})
          break
        case 'CHILD:ATTEMPT':
          //logRetry(step.name!, msg.attempt, step.options?.retries || pipelineConfig.options.retries!, next, msg.error)
          event('retry', msg)
          break
        case 'CHILD:RESULT':
          stepProcess.kill()
          resolve({step: msg.result.step, fatal: false, errors: msg.result.step.errors})
          break
        case 'CHILD:ERROR':
          stepProcess.kill()
          resolve({step: null, fatal: true, errors})
          break
      }
    })

    stepProcess.send({
      type: 'START',
      step: {
        index: idx,
        ...step,
      },
      context,
    })
  })
}

process.on('message', async (msg: ParentMessage<SourceData>) => {
  if (msg.type !== 'PARENT:RUN') return

  const {context, data} = msg
  const {config} = context

  const timeout = config.options.timeout
  const retries = config.options.retries

  const pipelineStartMs = performance.now()

  log(
    `Workflow "${context.name.toLowerCase()}" (@v${config.version}) started, id: ${
      context.id
    }. retries: ${retries}, timeout: ${ms(timeout as number)}`,
    'status',
  )

  context.state = PipelineState.Running
  event('workflow.start', context)

  let errors: WrappedError[] = []
  let results: PipelineStep[] = []

  // input data must be an object (validate on command side)
  let input = lodash.merge({}, config.data, data)
  if (config.print?.input) {
    log(`Workflow "${context.name.toLowerCase()}", input: ${JSON.stringify(input)}`, 'info')
  }

  if (config.mode === 'async') {
    const steps = await Promise.all(
      config.steps.map(async (step, idx) => {
        step.data = input

        return runStep(idx, step, context)
      }),
    )

    results = steps.filter(Boolean).map((s) => s.step)
  }

  let idx = 0
  // let child process deal with step input/output
  if (config.mode !== 'async') {
    for (const step of config.steps) {
      step.data = input

      const result = await runStep(idx, step, {
        ...context,
        steps: results,
      })

      if (result.step.errors && result.step.errors.length !== 0) {
        log(`Workflow "${context.name.toLowerCase()}", step "${step.name}" exited with errors`, 'warn')
        errors.push(...result.step.errors)
      }

      if (config.mode === 'chained') {
        input = lodash.merge({}, input, result.step.output)
      }

      results.push(result.step)
      idx++
    }
  }

  const failed = results.filter((step) => step.errors && step.errors.length > 0 && !step.output)
  const skipped = results.filter((step) => step.state === PipelineState.Skipped)
  const succeeded = results.length - (failed.length + skipped.length)

  log(`Workflow "${context.name.toLowerCase()}" has completed, id: ${context.id}.`, 'status')

  if (config.collect && config.output) {
    log(`artifacts from this run will be saved to ${config.output}`, 'status')
  } else {
    log(
      `artifacts from this run will not be saved, enable then with collect.logs and collect.run in your config`,
      'info',
    )
  }

  log(
    `executed ${config.steps.length} steps, ${succeeded} succeeded, ${failed.length} failed and ${
      skipped.length
    } skipped, duration: ${ms(Math.ceil(performance.now() - pipelineStartMs))} (${context.name})`,
    'success',
  )

  context.state = PipelineState.Completed
  event('workflow.end', context)
  process.send!({
    type: 'PARENT:RESULT',
    result: {
      config,
      steps: results,
    },
  })
})
