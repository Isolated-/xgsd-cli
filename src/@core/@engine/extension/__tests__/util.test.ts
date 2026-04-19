import {Block} from '../../types/block.types'
import {Logger} from '../../types/interfaces/logger.interface'
import {Plugin} from '../../types/interfaces/plugin.interface'
import {ProjectContext} from '../../types/project.types'
import {RetryAttempt} from '../../types/retry.types'
import {createRuntime, resolveFactory} from '../util'

class MockPlugin implements Plugin {}
class MockLogger implements Logger {
  log(message: unknown): Promise<void> | void {
    throw new Error('Method not implemented.')
  }
}

test('resolveFactory() auto-names correctly', async () => {
  const input = MockPlugin
  const factory1 = resolveFactory(input)
  let plugin = factory1({} as any)

  expect(plugin.name).toBe('MockPlugin')

  const factory2 = resolveFactory(new MockPlugin())
  plugin = factory2({} as any)
  expect(plugin.name).toBe('MockPlugin')

  const factory3 = resolveFactory((ctx) => new MockPlugin())
  plugin = factory3({} as any)
  expect(plugin.name).toBe('MockPlugin')
})

test('createRuntime()', async () => {
  const use = jest.fn()
  const build = jest.fn().mockReturnValue({
    pluginManager: {},
    loggerManager: {},
    executor: {},
  })

  const logger = jest.fn()

  const userCodeFn = jest.fn()
  const ctx = {} as any

  const {pluginManager, loggerManager, executor} = await createRuntime({
    context: ctx,
    plugins: [MockPlugin],
    loggers: [MockLogger],
    setupContainer: {
      use,
      logger,
      build,
    } as any,
    userCodeFn: userCodeFn,
  })

  expect(use).toHaveBeenCalledTimes(1)
  expect(use).toHaveBeenCalledWith(MockPlugin)

  expect(logger).toHaveBeenCalledTimes(1)
  expect(logger).toHaveBeenCalledWith(MockLogger)

  expect(build).toHaveBeenCalledTimes(1)
  expect(build).toHaveBeenCalledWith(ctx)

  expect(userCodeFn).toHaveBeenCalledTimes(1)

  expect(pluginManager).toEqual({})
  expect(loggerManager).toEqual({})
  expect(executor).toEqual({})
})
