import {v4} from 'uuid'
import {deepmerge} from '../util/object.util'

export type HelperFn = (input: any, ...args: any[]) => any

export const helpers: Record<string, HelperFn> = {
  upper: (input: any) => (typeof input === 'string' ? input.toUpperCase() : input),
  lower: (input: any) => (typeof input === 'string' ? input.toLowerCase() : input),
  trim: (input: any) => {
    if (typeof input === 'string') return input.trim()
    if (Array.isArray(input)) return input.map((v) => (typeof v === 'string' ? v.trim() : v))
    return input
  },
  hash: (input: any) => {
    if (typeof input !== 'string') return input
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(input).digest('hex')
  },
  json: (input: any) => {
    if (typeof input === 'string') {
      try {
        return JSON.parse(input)
      } catch {
        return input
      }
    }
    return JSON.stringify(input)
  },
  slice: (input: any, start: number, end?: number) => input.slice(start, end),
  length: (input: any) => {
    if (Array.isArray(input) || typeof input === 'string') return input.length
    if (typeof input === 'object' && input !== null) return Object.keys(input).length
    return 0
  },
  replace: (input: any, searchValue: string, replaceValue: string) => {
    if (typeof input !== 'string') return input
    return input.split(searchValue).join(replaceValue)
  },
  truncate: (input: any, start: number, end: number) => {
    if (typeof input !== 'string') return input
    if (input.length <= start + end) return input
    const first = input.slice(0, start)
    const last = input.slice(input.length - end)
    return `${first}...${last}`
  },
  type: (input: any, value: any): boolean => {
    if (value === 'array') return Array.isArray(input)
    if (value === 'object') return typeof input === 'object' && input !== null
    if (value === 'null') return input === null
    if (value === 'undefined') return input === undefined
    if (value === 'date') return input instanceof Date
    return typeof input === value
  },
  uuid: () => v4(),
  now: () => new Date().toISOString(),
  default: (input: any, value: any) => (input == null ? value : input),
  merge: (input: any, value: any) => {
    if (typeof input === 'object' && input !== null) {
      return deepmerge(input, value)
    }
    return input
  },
  concat: (input: any, value: any) => {
    if (typeof input === 'string') return input + value
    if (Array.isArray(input)) return input.concat(value)
    return input
  },
  censor: (input: any) => {
    if (typeof input === 'string') return input.replace(/./g, '*')
    return input
  },
  '!null': (input: any) => input !== null && input !== undefined,
  '!empty': (input: any) => {
    if (input == null) return false
    if (Array.isArray(input)) return input.length > 0
    if (typeof input === 'object') return Object.keys(input).length > 0
    if (typeof input === 'string') return input.length > 0
    return true
  },
  // Number helpers
  add: (input: number, value: number) => input + value,
  sub: (input: number, value: number) => input - value,
  mul: (input: number, value: number) => input * value,
  div: (input: number, value: number) => input / value,
  // comparisons
  gt: (input: number, value: number) => input > value,
  gte: (input: number, value: number) => input >= value,
  lt: (input: number, value: number) => input < value,
  lte: (input: number, value: number) => input <= value,
  eq: (input: any, value: any) => input === value,
  neq: (input: any, value: any) => input !== value,
}
