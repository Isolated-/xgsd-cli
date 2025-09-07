import {merge as tsmerge} from 'ts-deepmerge'
import * as deepmergeLib from 'deepmerge'

export const deepmerge = (...objects: any[]): object | undefined => {
  const filtered = objects.filter((o) => o && !isEmptyObject(o))
  if (!filtered || filtered.length === 0) return undefined
  return tsmerge({}, ...filtered)
}

export const deepmerge2 = (a: any, b: any): object | undefined => {
  if (!a && !b) return undefined
  if (!a) return b
  if (!b) return a
  return deepmergeLib(a, b)
}

export const merge = (...objects: any[]): object => {
  return Object.assign({}, ...objects)
}

export const isEmptyObject = (obj: object | null | undefined): boolean => {
  if (!obj) return true
  return Object.keys(obj).length === 0 && obj.constructor === Object
}

export const serialise = (obj: any): string => {
  return JSON.stringify(obj)
}

export const deserialise = (str: string): any => {
  return JSON.parse(str)
}
