import ms = require('ms')
import {join} from 'path'
import {PipelineStep} from '../../@types/pipeline.types'
import {WorkflowContext} from '../context.builder'
import {resolveStepData} from '../runner.process'
import {deepmerge2} from '../../util/object.util'
import {runWithConcurrency} from './concurrency.process'
import {ProcessManager} from './manager.process'

export async function runStep(idx: number, step: PipelineStep, context: WorkflowContext) {
  const startedAt = new Date().toISOString()
  let timeoutMs: number | undefined
  if (step.options?.timeout) {
    timeoutMs =
      typeof step.options.timeout === 'string' ? ms(step.options.timeout as ms.StringValue) : step.options.timeout
  }

  if (step.options?.timeout && step.options?.delay) {
    const delayMs =
      typeof step.options.delay === 'string' ? ms(step.options.delay as ms.StringValue) : step.options.delay

    if (delayMs && timeoutMs) {
      timeoutMs += delayMs // extend timeout by delay
    }
  }

  const envResolved = resolveStepData(step.env || {}, {
    context,
    step,
  })

  step.env = envResolved as Record<string, string>
  const path = join(__dirname, '..', 'workflow.step-process.js')
  const manager = new ProcessManager({...step, index: idx, startedAt}, context, path, timeoutMs)
  manager.fork()
  return manager.run()
}

export type ExecutionMode = 'async' | 'chained' | 'fanout' | 'batched'

export interface ExecutionOptions {
  mode: ExecutionMode
  concurrency?: number // only applies to async
}

export async function executeSteps(
  steps: PipelineStep[],
  input: Record<string, any>,
  context: WorkflowContext,
  options: ExecutionOptions,
): Promise<PipelineStep[]> {
  let results: PipelineStep[] = []

  let concurrency = options.concurrency || 1
  if (options.mode === 'chained' || options.mode === 'fanout') {
    concurrency = 1
  }

  if (options.mode === 'batched') {
    const batchSize = concurrency

    for (let i = 0; i < steps.length; i += batchSize) {
      const batch = steps.slice(i, i + batchSize)

      const batchResults: PipelineStep[] = []
      await runWithConcurrency(batch, batch.length, async (step, idx) => {
        step.data = input
        const result = await runStep(idx, step, {...context, steps: results})
        batchResults.push(result.step)
        return result.step
      })

      // merge batch outputs for next batch input
      const reduced = batchResults.reduce((acc, step) => {
        acc = deepmerge2(acc, step.output) as any
        return acc
      }, {})

      input = deepmerge2(input, reduced) as any
      results.push(...batchResults)
    }

    results = []
    return []
  }

  await runWithConcurrency(steps, concurrency!, async (step, idx) => {
    step.data = input // don't need to assign to `data` each time

    const result = await runStep(idx, step, {
      ...context,
      // empty array is sent to async/fanout as v0.4.2
      steps: options.mode === 'chained' ? results : [],
    })

    // merge chained ouputs for next step input
    if (options.mode === 'chained') {
      input = deepmerge2(input, result.step.output) as any
    }

    results.push(result.step)
  })

  // clear the array as results are now saved to disk
  results = []
  return results
}
