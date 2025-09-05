export const normaliseWorkflowName = (name: string): string => {
  if (!name) return ''

  // only allow alphanumeric
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}
