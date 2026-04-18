import {PipelineStep} from '../../@types/pipeline.types'
import {WorkflowContext} from '../context.builder'
import {createRuntime, resolveFactory} from '../extension/util'
import {Hooks} from '../types/hooks.types'
import {Executor} from '../types/generics/executor.interface'

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

test('resolveFactory()', () => {
  class MyExecutor implements Executor {
    async run(block: PipelineStep<unknown>, context: WorkflowContext<unknown>): Promise<PipelineStep<unknown>> {
      return block
    }
  }

  let result = resolveFactory(MyExecutor)
  expect(result).toEqual(expect.any(Function))

  result = resolveFactory(new MyExecutor())
  expect(result).toEqual(expect.any(Function))

  result = resolveFactory((_: any) => new MyExecutor())
  expect(result).toEqual(expect.any(Function))
})
