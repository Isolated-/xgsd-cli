import {testActionFn} from '../test.action'

describe('testActionFn', () => {
  it('should return the input string in uppercase', async () => {
    const result = await testActionFn('hello')
    expect(result).toBe('HELLO')
  })
})
