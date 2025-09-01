import {retry} from '../runner' // <- ensure runner API exports at (runner.ts)
import {RetryAttempt} from '../runner/retry.runner'

/**
 *  retry calls execute() and retries the given function
 *  a set number of times if it continues to fail.
 *  no isolation, knowledge of workers, etc..
 *  @param {T} data
 */
describe('retry() - retry logic above execute()', () => {
  test('should return null after exhausting all retries', async () => {
    const mockFn = jest.fn(async (data: number) => {
      throw new Error('Fail')
    })

    const result = await retry(1, mockFn, 3)
    expect(mockFn).toHaveBeenCalledTimes(3)
    expect(result.data).toBeUndefined()
  })

  test('should call onAttempt with correct parameters', async () => {
    const mockFn = jest.fn(async (data: number) => {
      throw new Error('Fail')
    })

    const onAttempt = jest.fn()
    const result = await retry(1, mockFn, 3, {onAttempt})

    expect(onAttempt).toHaveBeenCalledTimes(3)
    expect(onAttempt).toHaveBeenCalledWith({
      attempt: 0,
      error: expect.any(Object),
      finalAttempt: false,
      nextMs: 0,
    })

    expect(onAttempt).toHaveBeenCalledWith({
      attempt: 1,
      error: expect.any(Object),
      finalAttempt: false,
      nextMs: 0,
    })

    expect(onAttempt).toHaveBeenCalledWith({
      attempt: 2,
      error: expect.any(Object),
      finalAttempt: true,
      nextMs: 0,
    })

    expect(result.data).toBeUndefined()
  })

  test('should use delay option if provided', async () => {
    const mockFn = jest.fn(async (data: number) => {
      throw new Error('Fail')
    })

    const delay = jest.fn((attempt: number) => attempt * 100)
    const result = await retry(1, mockFn, 3, {delay})

    expect(delay).toHaveBeenCalledTimes(3)
    expect(delay).toHaveBeenCalledWith(0)
    expect(delay).toHaveBeenCalledWith(1)
    expect(result.data).toBeUndefined()
  })

  test('onAttempt should show nextMs when delay() is used', async () => {
    const mockFn = jest.fn(async (data: number) => {
      throw new Error('Fail')
    })

    let called = false
    const delay = jest.fn((attempt: number) => attempt * 100)
    const onAttempt = (attempt: RetryAttempt) => {
      expect(attempt.nextMs).toBe(delay(attempt.attempt))
      called = true
    }

    const result = await retry(1, mockFn, 3, {delay, onAttempt})

    expect(called).toBeTruthy()
    expect(result.data).toBeUndefined()
    expect(result.error).toEqual(expect.any(Object))
  })
})
