import {RetryAttempt} from '../@engine/runner/retry.runner'
import {WorkflowContext} from '../@engine/context.builder'
import {FlexibleWorkflowConfig, PipelineStep} from '../@types/pipeline.types'
import {ProjectContext} from '../@engine/types/project.types'
import {Block} from '../@engine/types/block.types'

export interface Hooks {
  // advanced lifecycle hooks
  onMessage?(event: any, context: ProjectContext): Promise<void>

  // project/block hooks
  projectStart?(context: ProjectContext): Promise<void>
  projectEnd?(context: ProjectContext): Promise<void>
  blockStart?(context: ProjectContext, block: Block): Promise<void>
  blockEnd?(context: ProjectContext, block: Block): Promise<void>
  blockRetry?(context: ProjectContext, block: Block, attempt: RetryAttempt): Promise<void>
  blockSkip?(context: ProjectContext, block: Block): Promise<void>
  blockWait?(context: ProjectContext, block: Block): Promise<void>
}
