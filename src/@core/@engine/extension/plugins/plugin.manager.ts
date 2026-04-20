import {EventBus} from '@xgsd/engine'
import {ProjectEvent} from '../../types/events.types'
import {PluginInput} from '../../types/factory.types'
import {Manager} from '../../types/generics/manager.interface'
import {Hooks} from '../../types/hooks.types'
import {ProjectContext} from '../../types/project.types'
import {emit, resolveFactory, runExit, runInit} from '../util'
import EventEmitter2 from 'eventemitter2'

export class PluginManager implements Manager {
  constructor(private plugins: Hooks[]) {}

  async emit(event: string, payload: any): Promise<void> {
    await emit(this.plugins, event, payload)
  }

  async init(ctx: ProjectContext, bus?: EventBus<EventEmitter2>): Promise<void> {
    return runInit(this.plugins, ctx, bus)
  }

  async exit(ctx: ProjectContext, bus?: EventBus<EventEmitter2>): Promise<void> {
    return runExit(this.plugins, ctx, bus)
  }
}
