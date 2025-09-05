import {normaliseWorkflowName} from '../workflow.util'

describe('normaliseWorkflowName', () => {
  test('should normalise workflow names correctly', () => {
    expect(normaliseWorkflowName(' My Workflow Name ')).toBe('my-workflow-name')
  })

  test('should handle numbers and special characters', () => {
    expect(normaliseWorkflowName('Workflow 123!')).toBe('workflow-123')
  })

  test('should handle multiple spaces', () => {
    expect(normaliseWorkflowName('My    Workflow')).toBe('my-workflow')
  })

  test('should handle empty string', () => {
    expect(normaliseWorkflowName('')).toBe('')
  })

  test('should handle string with only special characters', () => {
    expect(normaliseWorkflowName('!@#$%^&*()')).toBe('')
  })

  test('should handle undefined input gracefully', () => {
    expect(normaliseWorkflowName(undefined as any)).toBe('')
  })

  test('should handle null input gracefully', () => {
    expect(normaliseWorkflowName(null as any)).toBe('')
  })

  test("shouldn't strip any hypens from user input", () => {
    expect(normaliseWorkflowName('my-workflow')).toBe('my-workflow')
  })
})
