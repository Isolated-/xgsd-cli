import {merge as tsmerge} from 'ts-deepmerge'

export const deepmerge = (...objects: any[]): object => {
  return tsmerge({}, ...objects)
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
