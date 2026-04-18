import {PluginManager} from '../plugins/plugin.manager'
import {attachManagerLifecycleListeners} from '../lifecycle'
import {BlockEvent, ProjectEvent} from '../../types/events.types'
import {LoggerManager} from '../loggers/logger.manager'

test('captureRunnerEvents - PluginManager instance', () => {
  const onMock = jest.fn()
  const context = {
    stream: {on: onMock},
    format: () => ({}),
  } as any

  const manager = new PluginManager([])
  attachManagerLifecycleListeners(manager, context)
  expect(onMock).toHaveBeenCalledWith(ProjectEvent.Started, expect.any(Function))
  expect(onMock).toHaveBeenCalledWith(ProjectEvent.Ended, expect.any(Function))

  expect(onMock).toHaveBeenCalledWith(BlockEvent.Started, expect.any(Function))
  expect(onMock).toHaveBeenCalledWith(BlockEvent.Ended, expect.any(Function))
  expect(onMock).toHaveBeenCalledWith(BlockEvent.Retrying, expect.any(Function))
  expect(onMock).toHaveBeenCalledWith(BlockEvent.Skipped, expect.any(Function))
  expect(onMock).toHaveBeenCalledWith(BlockEvent.Waiting, expect.any(Function))
})

test('captureRunnerEvents - LoggerManager instance', () => {
  const onMock = jest.fn()
  const context = {
    stream: {on: onMock},
    format: () => ({}),
  } as any

  const manager = new LoggerManager([])
  attachManagerLifecycleListeners(manager, context)
  expect(onMock).toHaveBeenCalledWith(ProjectEvent.Started, expect.any(Function))
  expect(onMock).toHaveBeenCalledWith(ProjectEvent.Ended, expect.any(Function))

  expect(onMock).toHaveBeenCalledWith(BlockEvent.Started, expect.any(Function))
  expect(onMock).toHaveBeenCalledWith(BlockEvent.Ended, expect.any(Function))
  expect(onMock).toHaveBeenCalledWith(BlockEvent.Retrying, expect.any(Function))
  expect(onMock).toHaveBeenCalledWith(BlockEvent.Skipped, expect.any(Function))
  expect(onMock).toHaveBeenCalledWith(BlockEvent.Waiting, expect.any(Function))
})
