import EventEmitter2 from 'eventemitter2'
import {WorkflowContext} from '../../@shared/context.builder'
import {getWorkflowConfigDefaults} from '../../pipelines/pipelines.util'
import {PluginContainer} from '../plugin.container'
import {Hooks, ProjectContext} from '../runner.types'

class MockPlugin implements Hooks {}

describe('PluginContainer', () => {
  test('returns hooks correctly', () => {
    const context = {} as any

    const container = new PluginContainer(context)

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

    const hooks = container.createHooks(context)
    expect(hooks).toHaveLength(4)

    // preserves order
    expect(hooks).toEqual([expect.any(MockPlugin), expect.any(MockPlugin), expect.any(MockPlugin), instance])
  })
})
