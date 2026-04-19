import {Manager} from '../../types/generics/manager.interface'
import {Reporter} from '../../types/interfaces/reporter.interface'
import {ProjectContext} from '../../types/project.types'
import {emit, runExit, runInit} from '../util'

export class ReporterManager implements Manager {
  constructor(private reporters: Reporter[]) {}

  async emit(event: string, payload: any): Promise<void> {
    await emit(this.reporters, event, payload)
  }

  async init(ctx: ProjectContext): Promise<void> {
    return runInit(this.reporters, ctx)
  }

  async exit(ctx: ProjectContext): Promise<void> {
    return runExit(this.reporters, ctx)
  }
}
