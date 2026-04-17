import {PipelineStep, SourceData} from '../../../@types/pipeline.types'
import {WorkflowContext} from '../../context.builder'

export interface Executor<T = SourceData> {
  run(block: PipelineStep<T>, context: WorkflowContext<T>): Promise<PipelineStep<T>>
}
