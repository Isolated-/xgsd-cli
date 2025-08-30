import {runner as runnerFn} from '../runner'

describe('runner fn tests', () => {
  test('should call the internal function with the correct argument', () => {
    const mockFn = jest.fn(async (data: number, signal?: AbortSignal) => data + 1)
    runnerFn(1, mockFn)
    expect(mockFn).toHaveBeenCalledWith(1)
  })

  test('should call the internal function exactly once (success path)', () => {
    const mockFn = jest.fn(async (data: number) => data + 1)
    runnerFn(1, mockFn)
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  test('should return the result when successful', async () => {
    const mockFn = jest.fn(async (data: number) => data + 1)

    const result = await runnerFn(1, mockFn)
    expect(result.data).toBe(2)
    expect(result.error).toBeUndefined()
    expect(result.errors).toBeUndefined()
  })

  test('should run in local mode', async () => {
    async function action(data: number) {
      return data + 1
    }

    const result = await runnerFn(1, action, {mode: 'local'})
    expect(result.data).toBe(2)
    expect(result.error).toBeUndefined()
    expect(result.errors).toBeUndefined()
  })
})
