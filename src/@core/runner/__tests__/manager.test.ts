import {PluginManager} from '../plugin.manager'

test('runs hooks in order', async () => {
  const calls: string[] = []

  class A {
    async projectStart() {
      calls.push('A')
    }
  }

  class B {
    async projectStart() {
      calls.push('B')
    }
  }

  const context = {} as any
  const manager = new PluginManager([new A(), new B()])
  await manager.projectStart(context)

  expect(calls).toEqual(['A', 'B'])
})

test('no error thrown when hook doesnt exist', async () => {
  class A {}

  const context = {} as any
  const manager = new PluginManager([new A()])

  await expect(manager.projectStart(context)).resolves.toBeUndefined()
})

test('calls internal hook/event handlers', async () => {
  const projectStart = jest.fn()
  const projectEnd = jest.fn()
  const blockStart = jest.fn()
  const blockEnd = jest.fn()
  const blockRetry = jest.fn()
  const blockWait = jest.fn()
  const blockSkip = jest.fn()

  const hook = {
    projectStart,
    projectEnd,
    blockStart,
    blockEnd,
    blockRetry,
    blockWait,
    blockSkip,
  }

  const context = {} as any
  const block = {} as any
  const attempt = {} as any

  const manager = new PluginManager([hook])

  await manager.projectStart(context)
  expect(projectStart).toHaveBeenCalledTimes(1)
  expect(projectStart).toHaveBeenCalledWith(context, undefined, undefined)

  await manager.projectEnd(context)
  expect(projectEnd).toHaveBeenCalledTimes(1)
  expect(projectEnd).toHaveBeenCalledWith(context, undefined, undefined)

  await manager.blockStart(context, block)
  expect(blockStart).toHaveBeenCalledTimes(1)
  expect(blockStart).toHaveBeenCalledWith(context, block, undefined)

  await manager.blockEnd(context, block)
  expect(blockEnd).toHaveBeenCalledTimes(1)
  expect(blockEnd).toHaveBeenCalledWith(context, block, undefined)

  await manager.blockRetry(context, block, attempt)
  expect(blockRetry).toHaveBeenCalledTimes(1)
  expect(blockRetry).toHaveBeenCalledWith(context, block, attempt)

  await manager.blockWait(context, block)
  expect(blockWait).toHaveBeenCalledTimes(1)
  expect(blockWait).toHaveBeenCalledWith(context, block, undefined)

  await manager.blockSkip(context, block)
  expect(blockSkip).toHaveBeenCalledTimes(1)
  expect(blockSkip).toHaveBeenCalledWith(context, block, undefined)
})

test('continues execution if a plugin throws', async () => {
  const calls: string[] = []

  const badPlugin = {
    projectStart: async () => {
      throw new Error('fail')
    },
  }

  const goodPlugin = {
    projectStart: async () => {
      calls.push('good')
    },
  }

  const manager = new PluginManager([badPlugin, goodPlugin])

  await expect(manager.projectStart({} as any)).resolves.toBeUndefined()

  expect(calls).toEqual(['good'])
})
