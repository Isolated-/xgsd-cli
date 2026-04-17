import {PipelineStep, SourceData} from '../../@types/pipeline.types'
import {WorkflowContext} from '../context.builder'
import {processStep} from '../process/block.process'
import {Executor} from '../types/interfaces/executor.interface'

export class InProcessExecutor<T = SourceData> implements Executor<T> {
  async run(block: PipelineStep<T>, context: WorkflowContext<T>): Promise<PipelineStep<T>> {
    return processStep(block, context)
  }
}
