import {ProjectContext} from './project.types'
import {Block} from './block.types'
import {RetryAttempt} from './retry.types'

export type HookType = ProjectContext | Block | RetryAttempt

export interface Hooks {
  // new event handler
  // generic to avoid need to add more events
  // like projectWait
  on?<T = unknown>(event: string, payload: T): Promise<void> | void

  // init()
  // called when extension is first loaded
  init?(context: ProjectContext): Promise<void> | void

  // exit()
  // called when extension is unloaded
  exit?(context: ProjectContext): Promise<void> | void

  // project
  projectStart?(context: ProjectContext): Promise<void>
  projectEnd?(context: ProjectContext): Promise<void>

  // blocks
  blockStart?(context: ProjectContext, block: Block): Promise<void>
  blockEnd?(context: ProjectContext, block: Block): Promise<void>
  blockRetry?(context: ProjectContext, block: Block, attempt: RetryAttempt): Promise<void>
  blockSkip?(context: ProjectContext, block: Block): Promise<void>
  blockWait?(context: ProjectContext, block: Block): Promise<void>
}
