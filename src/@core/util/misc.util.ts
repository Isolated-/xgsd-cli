import {join, resolve} from 'path'

export const defaultWith = <T = unknown>(initial: T, ...others: T[]) => {
  return others.filter(Boolean).shift() ?? initial
}

export const resolvePath = (base: string, ...parts: string[]) => {
  const resolved = resolve(base)
  return join(resolved, ...parts)
}
