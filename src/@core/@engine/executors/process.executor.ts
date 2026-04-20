import ms = require('ms')
import {join} from 'path'
import {PipelineStep} from '../../@types/pipeline.types'
import {WorkflowContext} from '../context.builder'
import {ProcessManager} from '../process/manager.process'
import {Executor} from '../types/generics/executor.interface'
import {resolveStepData} from '../helpers/helpers.util'
import {deepmerge2} from '../../util/object.util'
import {Block, Context} from '../../config'
import {SourceData} from '@xgsd/engine'

export class ProcessExecutor<T extends SourceData = SourceData> implements Executor<T> {
  async run(block: Block<T>, context: Context<T>): Promise<Block<T>> {
    const result = await this.runIsolated(block, context)
    return result
  }

  private async runIsolated(block: Block<T>, context: Context<T>) {
    const startedAt = new Date().toISOString()

    let timeoutMs: number | undefined
    const opts = deepmerge2(context.config.project.options, block.options) as {
      timeout: string | number
    }

    if (opts?.timeout) {
      timeoutMs = typeof opts.timeout === 'string' ? ms(opts.timeout as ms.StringValue) : opts.timeout
    }

    //step.env = resolveStepData(step.env || {}, {context, step}) as Record<string, string>
    /*
    const path = join(__dirname, '..', 'process', 'block.process.js')
    const manager = new ProcessManager({...step, startedAt}, context, path, timeoutMs)

    manager.fork()

    process.on('exit', () => {
      manager.process.kill()
    })

    return manager.run()
*/
    return block
  }
}
