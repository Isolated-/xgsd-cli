import ms = require('ms')
import {join} from 'path'
import {PipelineStep, SourceData} from '../../@types/pipeline.types'
import {WorkflowContext} from '../context.builder'
import {ProcessManager} from '../process/manager.process'
import {Executor} from '../types/generics/executor.interface'
import {resolveStepData} from '../helpers/helpers.util'
import {deepmerge2} from '../../util/object.util'

export class ProcessExecutor<T = SourceData> implements Executor<T> {
  async run(block: PipelineStep<T>, context: WorkflowContext<T>): Promise<PipelineStep<T>> {
    const result = await this.runIsolated(block, context as WorkflowContext)
    return result.step
  }

  private async runIsolated(step: PipelineStep<T>, context: WorkflowContext) {
    const startedAt = new Date().toISOString()

    let timeoutMs: number | undefined
    const opts = deepmerge2(context.config.options, step.options) as {
      timeout: string | number
    }

    if (opts?.timeout) {
      timeoutMs = typeof opts.timeout === 'string' ? ms(opts.timeout as ms.StringValue) : opts.timeout
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
