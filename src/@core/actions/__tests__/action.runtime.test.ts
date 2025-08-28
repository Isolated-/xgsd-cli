import {ActionError, IAction, RunContext} from '../../generics/action.generic'
import {ActionRuntime} from '../action.runtime'

const mockSuccessAction = {
  id: 'success',
  run: jest.fn().mockResolvedValueOnce('success!'),
  cancel: jest.fn(),
}

const mockFailingAction = {
  id: 'failed',
  run: jest.fn().mockRejectedValueOnce(new ActionError('failure!')),
  cancel: jest.fn(),
}

const mockRetryAction = {
  id: 'retried',
  run: jest.fn().mockRejectedValueOnce('failed!'),
  cancel: jest.fn(),
}

describe('action runtime tests', () => {
  let runtime: ActionRuntime
  beforeEach(() => {
    runtime = ActionRuntime.createWithAction(mockSuccessAction)
  })

  test('should create an action runtime instance', () => {
    expect(runtime).toBeInstanceOf(ActionRuntime)
  })

  test('should have an `action` property', () => {
    expect(runtime.action).toBe(mockSuccessAction)
  })

  test('should have a `context` property with 0 progress and no data', () => {
    expect(runtime.context).toBeDefined()
    expect(runtime.context.progress).toBe(0)
    expect(runtime.context.data).toBeNull()
  })

  test('should execute the internal action and return the result', async () => {
    const result = await runtime.execute({
      success: true,
    })

    expect(result).toEqual({success: true, failed: false, errors: null, data: 'success!', retries: 0, max: 10})
  })

  test('should allow for cancellation', async () => {
    const runtime = ActionRuntime.createWithAction(mockSuccessAction)
    const cancelSpy = jest.spyOn(mockSuccessAction, 'cancel')
    await runtime.cancel()
    expect(cancelSpy).toHaveBeenCalled()
  })
})
