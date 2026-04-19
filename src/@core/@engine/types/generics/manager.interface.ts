import {Hooks} from '../hooks.types'
import {ProjectContext} from '../project.types'

export interface Manager {
  init(ctx: ProjectContext): Promise<void>
  exit(ctx: ProjectContext): Promise<void>
  emit<T = unknown>(event: string, payload: T): Promise<void>
}
