import {PipelineStep, SourceData} from '../../@types/pipeline.types'
import {WorkflowContext} from '../context.builder'
import {runStep} from '../process/orchestration.process'
import {Executor} from '../types/interfaces/executor.interface'

export class ProcessExecutor<T = SourceData> implements Executor<T> {
  async run(block: PipelineStep<T>, context: WorkflowContext<T>): Promise<PipelineStep<T>> {
    const result = await runStep(0, block, context as WorkflowContext)
    return result.step
  }
}
