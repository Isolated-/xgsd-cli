import {WorkflowContext} from '../@shared/context.builder'
import {PipelineStep} from '../@types/pipeline.types'

export type ProjectContext = WorkflowContext
export type Block = PipelineStep

export interface Hooks {
  projectStart(context: WorkflowContext): Promise<void>
  projectEnd(context: WorkflowContext): Promise<void>
  blockStart(context: ProjectContext, block: Block): Promise<void>
  blockEnd(context: ProjectContext, block: Block): Promise<void>
}
