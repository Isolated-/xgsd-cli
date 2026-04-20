import {join, resolve} from 'path'

export const defaultWith = <T = unknown>(initial: T, ...others: T[]) => {
  return others.filter(Boolean).shift() ?? initial
}

export const resolvePath = (base: string, ...parts: string[]) => {
  const resolved = resolve(base)
  return join(resolved, ...parts)
}

export const delayFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const byteSize = (data: unknown): number => {
  if (!data) return 0
  return Buffer.byteLength(JSON.stringify(data ?? ''), 'utf8')
}
