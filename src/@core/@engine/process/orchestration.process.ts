import {RunFn, runWithConcurrency, SourceData} from '@xgsd/engine'
import {deepmerge2} from '../../util/object.util'
import {Block, Context} from '../../config'

export type ExecutionMode = 'async' | 'chain' | 'fanout' | 'batched'

export interface ExecutionOptions {
  mode: ExecutionMode
  concurrency?: number // only applies to async
}

export type Runnable<T extends SourceData = SourceData> = {
  fn: RunFn<T>
  input?: Record<string, unknown> | null
  output?: Record<string, unknown> | null
}

/**
 *  provides a generic execution interface
 *  to execute projects/blocks
 *
 *  this is typically called in Orchestrator
 *  so there's no need to call it manually
 */
export async function executeRunnables<T extends Runnable<SourceData>, C extends Context>(args: {
  runnables: T[]
  input: Record<string, unknown>
  ctx: C
  options: ExecutionOptions
  run: (runnable: T, input: SourceData) => Promise<T>
}): Promise<T[]> {
  const {runnables, input, ctx, options, run} = args

  let concurrency = options.concurrency || 1
  if (options.mode === 'chain' || options.mode === 'fanout') {
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
        step.input = data
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

    return results
  }

  await runWithConcurrency(runnables, concurrency!, async (step, idx) => {
    step.input = data // don't need to assign to `data` each time

    const result = await run(step, {
      ...ctx,
      // empty array is sent to async/fanout as v0.4.2
      steps: options.mode === 'chain' ? results : [],
    })

    // merge chained ouputs for next step input
    if (options.mode === 'chain') {
      data = deepmerge2(input, result.output) as any
    }

    results.push(result)
  })

  return results
}

export async function executeBlocks<T extends SourceData = SourceData>(
  input: T,
  blocks: Block[],
  ctx: Context,
  options: ExecutionOptions,
  run: (block: Block, input: unknown) => Promise<Block>,
): Promise<Block[]> {
  return executeRunnables({
    input,
    runnables: blocks,
    ctx,
    options,
    run,
  })
}
