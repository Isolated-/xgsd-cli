import {Hooks} from '../../../types/hooks.types'
import {PluginRegistry} from '../plugin.container'

class MockPlugin implements Hooks {}

test('returns hooks correctly', () => {
  const context = {} as any

  const container = new PluginRegistry()

  // class
  container.use(MockPlugin)

  // factory style
  container.use((ctx) => {
    expect(ctx).toBe(context)
    return new MockPlugin()
  })

  // instance
  container.use(new MockPlugin())

  // doesn't re-create instances
  const instance = new MockPlugin()
  container.use(instance)

  const hooks = container.build(context)
  expect(hooks).toHaveLength(4)

  // preserves order
  expect(hooks).toEqual([expect.any(MockPlugin), expect.any(MockPlugin), expect.any(MockPlugin), instance])
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
