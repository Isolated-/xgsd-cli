import {ProjectEvent} from '../../../types/events.types'
import {PluginRegistry} from '../plugin.registry'
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
  await manager.emit('projectStart', context)

  expect(calls).toEqual(['A', 'B'])
})

test('no error thrown when hook doesnt exist', async () => {
  class A {}

  const context = {} as any
  const manager = new PluginManager([new A()])

  await expect(manager.emit('projectStart', context)).resolves.toBeUndefined()
})

test('calls internal hooks', async () => {
  const mock = {
    projectStart: jest.fn(),
    projectEnd: jest.fn(),
    blockStart: jest.fn(),
    blockEnd: jest.fn(),
    blockRetry: jest.fn(),
  }

  const context = {} as any
  const block = {} as any
  const attempt = {}

  const manager = new PluginManager([mock])

  // projectStart
  await manager.emit('projectStart', context)
  expect(mock.projectStart).toHaveBeenCalledTimes(1)
  expect(mock.projectStart).toHaveBeenCalledWith(context)

  // projectEnd
  await manager.emit('projectEnd', context)
  expect(mock.projectEnd).toHaveBeenCalledTimes(1)
  expect(mock.projectEnd).toHaveBeenCalledWith(context)

  // blockStart
  await manager.emit('blockStart', context, block)
  expect(mock.blockStart).toHaveBeenCalledTimes(1)
  expect(mock.blockStart).toHaveBeenCalledWith(context, block)

  // blockEnd
  await manager.emit('blockEnd', context, block)
  expect(mock.blockEnd).toHaveBeenCalledTimes(1)
  expect(mock.blockEnd).toHaveBeenCalledWith(context, block)

  // blockRetry
  await manager.emit('blockRetry', context, block, attempt)
  expect(mock.blockRetry).toHaveBeenCalledTimes(1)
  expect(mock.blockRetry).toHaveBeenCalledWith(context, block, attempt)
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

  await expect(manager.emit('projectStart', {} as any)).resolves.toBeUndefined()

  expect(calls).toEqual(['good'])
})
