import {WorkflowContext} from '../../context.builder'
import {FactoryInput, LoggerFactory, LoggerInput} from '../../types/factory.types'
import {Registry} from '../../types/generics/registry.interface'
import {Logger} from '../../types/interfaces/logger.interface'
import {buildFactories, resolveFactory} from '../../util'

export class LoggerRegistry implements Registry<LoggerInput, Logger[]> {
  private factories: LoggerFactory[] = []

  use(input: FactoryInput<LoggerInput>): void {
    this.factories.push(resolveFactory(input))
  }

  build(ctx: WorkflowContext): Logger[] {
    return buildFactories(this.factories, ctx)
  }
}
