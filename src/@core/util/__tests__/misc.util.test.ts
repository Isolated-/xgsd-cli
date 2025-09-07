import {defaultWith} from '../misc.util'
import {delayFor} from '../misc.util'

describe('defaultWith tests', () => {
  test('should return default value if value is undefined', () => {
    expect(defaultWith('default', undefined)).toBe('default')
  })

  test('should return default value if value is null', () => {
    expect(defaultWith('default', null)).toBe('default')
  })

  test('should return the first truthy value', () => {
    expect(defaultWith('default', null, undefined, 'value1', 'value2')).toBe('value1')
  })

  test('should return initial value if all others are falsy', () => {
    expect(defaultWith<any>('default', null, undefined, '', 0)).toBe('default')
  })

  test('should work with numbers', () => {
    expect(defaultWith<number>(10, 0, -5, 20)).toBe(-5)
  })
})

describe('delayFor', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('resolves after the specified time', async () => {
    const ms = 500
    const promise = delayFor(ms)

    // At this point, promise is pending
    let isResolved = false
    promise.then(() => {
      isResolved = true
    })

    // Fast-forward half the time, should still be pending
    jest.advanceTimersByTime(250)
    expect(isResolved).toBe(false)

    // Fast-forward the rest
    jest.advanceTimersByTime(250)
    await promise
    expect(isResolved).toBe(true)
  })
})
