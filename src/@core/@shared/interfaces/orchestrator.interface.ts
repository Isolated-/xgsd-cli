import {PipelineStep, SourceData} from '../../@types/pipeline.types'
import {WorkflowEvent} from '../../workflows/workflow.events'
import {WorkflowContext} from '../context.builder'

export interface Orchestrator<T extends SourceData> {
  before(): Promise<void> | void
  orchestrate(): Promise<void> | void
  run(step: PipelineStep<T>): Promise<PipelineStep<T>>
  after(): Promise<void> | void
}

export interface OrchestratorEvent {
  emit(event: WorkflowEvent, payload: any): void
}
