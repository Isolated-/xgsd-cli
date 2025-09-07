import {WorkflowContext} from '../@shared/context.builder'

export const normaliseWorkflowName = (name: string): string => {
  if (!name) return ''

  // only allow alphanumeric
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export const getWorkflowId = (context: WorkflowContext): string => {
  return normaliseWorkflowName(context.name) + `-${context.hash}`
}
