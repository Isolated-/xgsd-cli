import {HelperFn} from './helpers.builtin'

export type Helpers = Record<string, HelperFn>

export class HelpersRegistry {
  helpers!: Helpers

  constructor(builtin: Helpers = {}) {
    this.helpers = builtin
  }

  register(name: string, fn: HelperFn) {
    this.helpers[name] = fn
  }

  resolve(name: string): HelperFn {
    const fn = this.helpers[name]

    console.log(fn)

    if (!fn) {
      throw new Error('unknown helper') // fit this in better
    }

    return fn
  }
}
