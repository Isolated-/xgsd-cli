import {WorkflowContext} from '../context.builder'
import {createRuntime} from '../setup'
import {Hooks} from '../types/hooks.types'

class CorePlugin implements Hooks {}

test('createRuntime()', async () => {
  const use = jest.fn()
  const build = jest.fn().mockReturnValue({
    pluginManager: {},
    loggerManager: {},
    executor: {},
  })

  const userCodeFn = jest.fn()
  const ctx = {} as any

  const {pluginManager, executor} = await createRuntime({
    context: ctx,
    plugins: [CorePlugin],
    setupContainer: {
      use,
      build,
    } as any,
    userCodeFn: userCodeFn,
  })

  expect(use).toHaveBeenCalledTimes(1)
  expect(use).toHaveBeenCalledWith(CorePlugin)

  expect(build).toHaveBeenCalledTimes(1)
  expect(build).toHaveBeenCalledWith(ctx)

  expect(userCodeFn).toHaveBeenCalledTimes(1)

  expect(pluginManager).toEqual({})
  //expect(loggerManager).toEqual({})
  expect(executor).toEqual({})
})
