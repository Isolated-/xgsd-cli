import {execute} from '../runner'

/**
 *  execute() - execute fn with error handler/wrapper
 *  no child processes, workers, or isolation - see runner()
 *  @note T and R must extend SourceData (see @types/pipeline.types.ts)
 */
describe('execute() - execute fn with error handler/wrapper', () => {
  test('should call the internal function with the correct argument', () => {
    const mockFn = jest.fn(async (data: number, signal?: AbortSignal) => data + 1)
    execute(1, mockFn)
    expect(mockFn).toHaveBeenCalledWith(1)
  })

  test('should call the internal function exactly once (success path)', () => {
    const mockFn = jest.fn(async (data: number) => data + 1)
    execute(1, mockFn)
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  test('should return the result when successful', async () => {
    const mockFn = jest.fn(async (data: number) => data + 1)

    const result = await execute(1, mockFn)
    expect(result.data).toBe(2)
    expect(result.error).toBeNull()
  })

  test('should handle any data type', async () => {
    const fn = jest.fn(async (data: any) => data)
    let result = await execute('string', fn)
    expect(result.data).toBe('string')
    expect(result.error).toBeNull()

    result = await execute(1, fn)
    expect(result.data).toBe(1)
    expect(result.error).toBeNull()

    result = await execute(true, fn)
    expect(result.data).toBe(true)
    expect(result.error).toBeNull()

    result = await execute(1, fn)
    expect(result.data).toBe(1)
    expect(result.error).toBeNull()

    result = await execute(true, fn)
    expect(result.data).toBe(true)
    expect(result.error).toBeNull()

    result = await execute([1, 2, 3], fn)
    expect(result.data).toEqual([1, 2, 3])
    expect(result.error).toBeNull()

    result = await execute(null, fn)
    expect(result.data).toBeNull()
    expect(result.error).toBeNull()

    result = await execute(undefined, fn)
    expect(result.data).toBeUndefined()
    expect(result.error).toBeNull()
  })

  test('should transform the response when called with a transformer', async () => {
    const fn = jest.fn(async (data: number) => data + 1)
    const transformer = (data: any) => ({transformed: data})
    const result = await execute(1, fn, transformer)
    expect(result.data).toEqual({transformed: 2})
    expect(result.error).toBeNull()
  })

  test('should catch and wrap internal error correctly', async () => {
    const fn = jest.fn(async (data: number) => {
      throw new Error('Internal error')
    })

    const fn2 = jest.fn(async (data: number) => {
      throw 'message'
    })

    const fn3 = jest.fn(async (data: number) => {
      throw {message: 'Internal error'}
    })

    const fn4 = jest.fn(async (data: number) => {
      throw data
    })

    const result = await execute(1, fn)
    expect(result.error).toBeInstanceOf(Object)
    expect(result.error?.message).toBe('Internal error')

    const result2 = await execute(1, fn2)
    expect(result2.error).toBeInstanceOf(Object)
    expect(result2.error?.message).toBe('message')

    const result3 = await execute(1, fn3)
    expect(result3.error).toBeInstanceOf(Object)
    expect(result3.error?.message).toBe('Internal error')

    const result4 = await execute(1, fn4)
    expect(result4.error).toBeInstanceOf(Object)
    expect(result4.error?.original).toEqual(1)
    expect(result4.error?.message).toBe('see original')
  })
})
