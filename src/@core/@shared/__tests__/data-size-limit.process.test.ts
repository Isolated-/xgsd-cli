import {WorkflowError, WorkflowErrorCode} from '../workflow.error'
import {dataSizeRegulator} from '../workflow.step-process'

describe('Data Size Limit', () => {
  test('should handle output within size limit', () => {
    const result = dataSizeRegulator({foo: 'bar'}, 256)
    expect(result).toEqual({foo: 'bar'})
  })

  test('should throw error for output exceeding size limit', () => {
    expect(() => dataSizeRegulator({foo: 'a'.repeat(300 * 1024)}, 256)).toThrow(
      new WorkflowError(`Step output exceeds 256 KB limit`, WorkflowErrorCode.HardDataSize),
    )
  })

  test('should handle empty output', () => {
    const result = dataSizeRegulator({}, 256)
    expect(result).toEqual({})
  })

  test('should handle null output', () => {
    const result = dataSizeRegulator(null, 256)
    expect(result).toEqual(null)
  })

  test('should handle undefined output', () => {
    const result = dataSizeRegulator(undefined, 256)
    expect(result).toEqual(undefined)
  })

  test('should handle non-object output within size limit', () => {
    const result = dataSizeRegulator('a'.repeat(100 * 1024), 256)
    expect(result).toEqual('a'.repeat(100 * 1024))
  })

  test('should throw error for non-object output exceeding size limit', () => {
    expect(() => dataSizeRegulator('a'.repeat(300 * 1024), 256)).toThrow(
      new WorkflowError(`Step output exceeds 256 KB limit`, WorkflowErrorCode.HardDataSize),
    )
  })
})
