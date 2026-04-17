import ms = require('ms')
import {PipelineStep} from '../../@types/pipeline.types'
import {WorkflowContext} from '../context.builder'
import {deepmerge2} from '../../util/object.util'
import {runWithConcurrency} from '../execution/concurrency'

export type ExecutionMode = 'async' | 'chained' | 'fanout' | 'batched'

export interface ExecutionOptions {
  mode: ExecutionMode
  concurrency?: number // only applies to async
}

export async function executeSteps(
  steps: PipelineStep[],
  input: Record<string, any>,
  context: WorkflowContext<any>,
  options: ExecutionOptions,
  run: (step: PipelineStep, input: any) => Promise<PipelineStep>,
): Promise<PipelineStep[]> {
  let concurrency = options.concurrency || 1
  if (options.mode === 'chained' || options.mode === 'fanout') {
    concurrency = 1
  }

  let results: PipelineStep[] = []

  if (options.mode === 'batched') {
    const batchSize = concurrency

    for (let i = 0; i < steps.length; i += batchSize) {
      const batch = steps.slice(i, i + batchSize)

      const batchResults: PipelineStep[] = []
      await runWithConcurrency(batch, batch.length, async (step, idx) => {
        step.data = input
        const result = await run(step, {...context, steps: results})
        batchResults.push(result)
        return result
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

    const result = await run(step, {
      ...context,
      // empty array is sent to async/fanout as v0.4.2
      steps: options.mode === 'chained' ? results : [],
    })

    // merge chained ouputs for next step input
    if (options.mode === 'chained') {
      input = deepmerge2(input, result.output) as any
    }

    results.push(result)
  })

  return results
}
