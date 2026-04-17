import {PipelineStep, SourceData} from '../../@types/pipeline.types'

export interface Orchestrator<T extends SourceData> {
  before(): Promise<void> | void
  orchestrate(data?: T): Promise<void> | void
  run(step: PipelineStep<T>): Promise<PipelineStep<T>>
  after(): Promise<void> | void
}
