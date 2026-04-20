import {WorkflowContext} from '../../context.builder'
import {PluginFactory, PluginInput} from '../../types/factory.types'
import {Hooks} from '../../types/hooks.types'
import {Registry} from '../../types/generics/registry.interface'
import {buildFactories, resolveFactory} from '../util'

export class PluginRegistry implements Registry<PluginInput, Hooks[]> {
  private factories: PluginFactory[] = []

  use(input: PluginInput, core?: boolean) {
    this.factories.push(resolveFactory(input, {type: 'plugin', core}))
  }

  build(ctx: WorkflowContext<unknown>): Hooks[] {
    return buildFactories(this.factories, ctx)
  }
}
