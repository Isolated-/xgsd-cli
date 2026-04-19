import {Plugin} from '../../../types/interfaces/plugin.interface'
import {PluginRegistry} from '../plugin.registry'

class A implements Plugin {}
class B implements Plugin {}
class C implements Plugin {}

test('.use() accepts factory creation', () => {
  const registry = new PluginRegistry()
  const factory = (ctx: any) => new A()

  expect(() => registry.use(factory)).not.toThrow()
})

test('.use() accepts uninitalised classes', () => {
  const registry = new PluginRegistry()
  const cls = A

  expect(() => registry.use(cls)).not.toThrow()
})

test('.use() accepts initialised classes', () => {
  const registry = new PluginRegistry()
  const cls = new A()

  expect(() => registry.use(cls)).not.toThrow()
})

test('.use doesnt register undefined plugins', () => {
  const context = {} as any
  const container = new PluginRegistry() as any

  // when no return value is provided with factory style construction
  // the plugin would still be added to _hooks
  // this would result in "Cannot read properties of undefined (reading 'projectStart')"
  container.use((ctx: any) => {})

  // expected behaviour is an empty array of hooks:
  const hooks = container.build(context)
  expect(hooks).toHaveLength(0)
})
