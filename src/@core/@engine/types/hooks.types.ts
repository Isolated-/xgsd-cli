import {RetryAttempt} from '../runner/retry.runner'
import {ProjectContext} from './project.types'
import {Block} from './block.types'

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
