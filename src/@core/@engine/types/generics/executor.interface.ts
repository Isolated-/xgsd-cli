import {PipelineStep, SourceData} from '../../../@types/pipeline.types'
import {WorkflowContext} from '../../context.builder'

export interface Executor<T = SourceData> {
  init?(ctx: WorkflowContext<T>): Promise<void> | void
  run(block: PipelineStep<T>, context: WorkflowContext<T>): Promise<PipelineStep<T>>
}
