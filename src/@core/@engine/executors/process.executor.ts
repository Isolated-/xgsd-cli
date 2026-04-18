import ms = require('ms')
import {join} from 'path'
import {PipelineStep, SourceData} from '../../@types/pipeline.types'
import {WorkflowContext} from '../context.builder'
import {ProcessManager} from '../process/manager.process'
import {Executor} from '../types/interfaces/executor.interface'
import {resolveStepData} from '../helpers/helpers.util'

export class ProcessExecutor<T = SourceData> implements Executor<T> {
  async run(block: PipelineStep<T>, context: WorkflowContext<T>): Promise<PipelineStep<T>> {
    const result = await this.runIsolated(block, context as WorkflowContext)
    return result.step
  }

  private async runIsolated(step: PipelineStep<T>, context: WorkflowContext) {
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
        timeoutMs += delayMs
      }
    }

    step.env = resolveStepData(step.env || {}, {context, step}) as Record<string, string>

    const path = join(__dirname, '..', 'process', 'block.process.js')
    const manager = new ProcessManager({...step, startedAt}, context, path, timeoutMs)

    manager.fork()

    process.on('exit', () => {
      manager.process.kill()
    })

    return manager.run()
  }
}
