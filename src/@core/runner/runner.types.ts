import {WorkflowContext} from '../@shared/context.builder'
import {PipelineStep} from '../@types/pipeline.types'

export type ProjectContext = WorkflowContext
export type Block = PipelineStep

export interface Hooks {
  // advanced lifecycle hooks
  onMessage?(event: any, context: ProjectContext): Promise<void>

  // project/block hooks
  projectStart?(context: ProjectContext): Promise<void>
  projectEnd?(context: ProjectContext): Promise<void>
  blockStart?(context: ProjectContext, block: Block): Promise<void>
  blockEnd?(context: ProjectContext, block: Block): Promise<void>
}
