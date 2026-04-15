import {Hooks, ProjectContext, Block} from '../runner.types'

export class ReporterPlugin implements Hooks {
  async projectStart(context: ProjectContext): Promise<void> {}
  async projectEnd(context: ProjectContext): Promise<void> {}
  async blockStart(): Promise<void> {}
  async blockEnd(): Promise<void> {}
}
