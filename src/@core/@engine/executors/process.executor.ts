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
  async run(block: Block, context: Context): Promise<Block<T>> {
    const result = await this.runIsolated(block, context)
    return result.block
  }

  private async runIsolated(block: Block, context: Context) {
    let timeoutMs: number | undefined
    const opts = deepmerge2(context.config.project.options, block.options) as {
      timeout: string | number
    }

    if (opts?.timeout) {
      timeoutMs = typeof opts.timeout === 'string' ? ms(opts.timeout as ms.StringValue) : opts.timeout
    }

    const path = join(__dirname, '..', 'process', 'block.process.js')
    const manager = new ProcessManager(block, context, path, timeoutMs)

    manager.fork()

    process.on('exit', () => {
      manager.process.kill()
    })

    return manager.run()
  }
}
