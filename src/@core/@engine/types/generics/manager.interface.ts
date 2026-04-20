import {EventBus} from '@xgsd/engine'
import {Hooks} from '../hooks.types'
import {ProjectContext} from '../project.types'
import {EventEmitter2} from 'eventemitter2'

export interface Manager {
  init(ctx: ProjectContext, bus: EventBus<EventEmitter2>): Promise<void>
  exit(ctx: ProjectContext): Promise<void>
  emit<T = unknown>(event: string, payload: T): Promise<void>
}
