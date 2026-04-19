import {ProjectEvent} from '../../types/events.types'
import {PluginInput} from '../../types/factory.types'
import {Manager} from '../../types/generics/manager.interface'
import {Hooks} from '../../types/hooks.types'
import {ProjectContext} from '../../types/project.types'
import {emit, resolveFactory, runExit, runInit} from '../util'

export class PluginManager implements Manager {
  constructor(private plugins: Hooks[]) {}

  async emit(event: string, payload: any): Promise<void> {
    await emit(this.plugins, event, payload)
  }

  async init(ctx: ProjectContext): Promise<void> {
    return runInit(this.plugins, ctx)
  }

  async exit(ctx: ProjectContext): Promise<void> {
    return runExit(this.plugins, ctx)
  }
}
