import ms = require('ms')
import {PipelineStep} from '../../@types/pipeline.types'
import {WorkflowContext} from '../context.builder'
import {deepmerge2} from '../../util/object.util'
import {runWithConcurrency} from '../execution/concurrency'
import {RunFn} from '@xgsd/engine'
import {Require} from '../types/require.type'

export type ExecutionMode = 'async' | 'chained' | 'fanout' | 'batched'

export interface ExecutionOptions {
  mode: ExecutionMode
  concurrency?: number // only applies to async
}

export type Runnable = {
  fn: RunFn<any, any>
  data?: Record<string, unknown> | null
  output?: Record<string, unknown> | null
}

export type Context = {}

/**
 *  provides a generic execution interface
 *  to execute projects/blocks
 *
 *  this is typically called in Orchestrator
 *  so there's no need to call it manually
 */
export async function executeRunnables<T extends Runnable, C extends Context>(args: {
  runnables: T[]
  input: Record<string, unknown>
  ctx: C
  options: ExecutionOptions
  run: (runnable: T, input: Record<string, unknown>) => Promise<T>
}): Promise<T[]> {
  const {runnables, input, ctx, options, run} = args

  let concurrency = options.concurrency || 1
  if (options.mode === 'chained' || options.mode === 'fanout') {
    concurrency = 1
  }

  let results: T[] = []
  let data = input

  if (options.mode === 'batched') {
    const batchSize = concurrency

    for (let i = 0; i < runnables.length; i += batchSize) {
      const batch = runnables.slice(i, i + batchSize)

      const batchResults: T[] = []
      await runWithConcurrency(batch, batch.length, async (step, idx) => {
        step.data = data
        const result = await run(step, {...ctx, steps: results})
        batchResults.push(result)
        return result
      })

      // merge batch outputs for next batch input
      const reduced = batchResults.reduce((acc, step) => {
        acc = deepmerge2(acc, step.output) as any
        return acc
      }, {})

      data = deepmerge2(input, reduced) as any
      results.push(...batchResults)
    }

    results = []
    return []
  }

  await runWithConcurrency(runnables, concurrency!, async (step, idx) => {
    step.data = data // don't need to assign to `data` each time

    const result = await run(step, {
      ...ctx,
      // empty array is sent to async/fanout as v0.4.2
      steps: options.mode === 'chained' ? results : [],
    })

    // merge chained ouputs for next step input
    if (options.mode === 'chained') {
      data = deepmerge2(input, result.output) as any
    }

    results.push(result)
  })

  return results
}

export async function executeSteps(
  steps: PipelineStep[],
  input: Record<string, any>,
  context: WorkflowContext<any>,
  options: ExecutionOptions,
  run: (step: PipelineStep, input: any) => Promise<PipelineStep>,
): Promise<PipelineStep[]> {
  return executeRunnables<PipelineStep, WorkflowContext>({
    runnables: steps,
    input,
    ctx: context,
    options,
    run,
  })
}
