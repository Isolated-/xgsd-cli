import {WorkflowContext} from '../../context.builder'
import {FactoryInput, ReporterFactory, ReporterInput} from '../../types/factory.types'
import {Registry} from '../../types/generics/registry.interface'
import {Reporter} from '../../types/interfaces/reporter.interface'
import {buildFactories, resolveFactory} from '../util'

export class ReporterRegistry implements Registry<ReporterInput, Reporter[]> {
  private factories: ReporterFactory[] = []

  use(input: ReporterInput): void {
    this.factories.push(resolveFactory(input))
  }

  build(ctx: WorkflowContext<unknown>): Reporter[] {
    return buildFactories(this.factories, ctx)
  }
}
