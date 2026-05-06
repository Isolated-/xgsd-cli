import * as crypto from 'crypto'

const SIGNIFICANT_KEYS = new Set([
  'type',
  'name',
  'operator',
  'callee',
  'arguments',
  'body',
  'params',
  'init',
  'declarations',
  'source',
  'specifiers',
])

export function hashNode(node: any): string {
  const buffer: string[] = []

  function visit(n: any) {
    if (!n) return buffer.push('null')

    buffer.push(`{${n.type}`)

    const keys = Object.keys(n)
      .filter((k) => SIGNIFICANT_KEYS.has(k))
      .sort()

    for (const key of keys) {
      const value = n[key]

      buffer.push(`[${key}]`)

      if (Array.isArray(value)) {
        buffer.push('[')
        for (const v of value) visit(v)
        buffer.push(']')
      } else if (typeof value === 'object') {
        visit(value)
      } else {
        buffer.push(String(value))
      }
    }

    buffer.push('}')
  }

  visit(node)

  return crypto.createHash('sha256').update(buffer.join('|')).digest('hex')
}
