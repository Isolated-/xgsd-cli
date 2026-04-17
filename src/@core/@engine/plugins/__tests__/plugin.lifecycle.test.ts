import {PluginManager} from '../plugin.manager'
import {captureRunnerEvents} from '../plugin.lifecycle'
import {BlockEvent, ProjectEvent} from '../../types/events.types'

test('captureRunnerEvents', () => {
  const onMock = jest.fn()
  const context = {
    stream: {on: onMock},
    format: () => ({}),
  } as any

  const manager = new PluginManager([])
  captureRunnerEvents(manager, context)
  expect(onMock).toHaveBeenCalledWith(ProjectEvent.Started, expect.any(Function))
  expect(onMock).toHaveBeenCalledWith(ProjectEvent.Ended, expect.any(Function))

  expect(onMock).toHaveBeenCalledWith(BlockEvent.Started, expect.any(Function))
  expect(onMock).toHaveBeenCalledWith(BlockEvent.Ended, expect.any(Function))
  expect(onMock).toHaveBeenCalledWith(BlockEvent.Retrying, expect.any(Function))
  expect(onMock).toHaveBeenCalledWith(BlockEvent.Skipped, expect.any(Function))
  expect(onMock).toHaveBeenCalledWith(BlockEvent.Waiting, expect.any(Function))
})
