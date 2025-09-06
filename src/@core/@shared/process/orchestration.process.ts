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

export type ExecutionMode = 'async' | 'chained' | 'fanout'

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
  const results: PipelineStep[] = []

  if (options.mode === 'async') {
    await runWithConcurrency(steps, options.concurrency ?? 4, async (step, idx) => {
      step.data = input

      const result = await runStep(idx, step, {
        ...context,
        steps: results,
      })

      //results.push(result.step)
    })
  } else {
    let idx = 0
    for (const step of steps) {
      step.data = input

      const result = await runStep(idx, step, {
        ...context,
        steps: results,
      })

      if (options.mode === 'chained') {
        input = deepmerge2(input, result.step.output) as any
      }

      //results.push(result.step)
      idx++
    }
  }

  return results
}
