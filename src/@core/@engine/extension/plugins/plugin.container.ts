import {WorkflowContext} from '../../context.builder'
import {PluginFactory, PluginInput} from '../../types/factory.types'
import {Hooks} from '../../types/hooks.types'
import {Registry} from '../../types/generics/registry.interface'
import {ProjectConfig, ProjectContext} from '../../types/project.types'
import {buildFactories, resolveFactory} from '../../util'

export class PluginRegistry implements Registry<PluginInput, Hooks[]> {
  private factories: PluginFactory[] = []

  use(input: PluginInput) {
    this.factories.push(resolveFactory(input))
  }

  build(ctx: WorkflowContext<unknown>): Hooks[] {
    return buildFactories(this.factories, ctx)
  }
}
