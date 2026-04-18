import {WorkflowContext} from '../../context.builder'
import {FactoryInput} from '../factory.types'

export interface Registry<T, R, C = WorkflowContext> {
  use(input: FactoryInput<T>): void
  build(ctx: C): R
}
