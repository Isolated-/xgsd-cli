import {Manager} from '../../types/generics/manager.interface'
import {Reporter} from '../../types/interfaces/reporter.interface'
import {invoke, InvokeFn} from '../util'

export class ReporterManager implements Manager {
  constructor(private reporters: Reporter[]) {}

  async emit(event: InvokeFn, ...args: any[]): Promise<void> {
    await invoke(this.reporters, event, args[0], args[1], args[2])
  }
}
