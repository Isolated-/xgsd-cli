import {defaultWith} from '../misc.util'

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
