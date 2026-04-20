import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'yaml'
import {deepmerge2} from './util/object.util'

export type ParseError = {
  stage: 'load' | 'parse' | 'validate'
  message: string
  details?: unknown
}

export class ConfigParser<T = unknown> {
  private _errors: ParseError[] = []
  private _raw: unknown
  private _parsed: any
  private _config?: T

  constructor(public input: string | object) {}

  get errors() {
    return this._errors
  }

  // -------------------------
  // LOAD
  // -------------------------
  load(): this {
    try {
      if (typeof this.input === 'object') {
        this._raw = this.input
        return this
      }

      const filePath = path.resolve(this.input)

      if (!fs.existsSync(filePath)) {
        throw new Error(`Config file not found: ${filePath}`)
      }

      const content = fs.readFileSync(filePath, 'utf-8')
      this._raw = content

      return this
    } catch (err: any) {
      this._errors.push({
        stage: 'load',
        message: err.message,
        details: err,
      })
      return this
    }
  }

  // -------------------------
  // PARSE
  // -------------------------
  parse(): this {
    try {
      if (!this._raw) return this

      // already object
      if (typeof this._raw === 'object') {
        this._parsed = this._raw
        return this
      }

      const raw = String(this._raw).trim()

      // try JSON first
      try {
        this._parsed = JSON.parse(raw)
        return this
      } catch {}

      // fallback YAML
      this._parsed = yaml.parse(raw)

      return this
    } catch (err: any) {
      this._errors.push({
        stage: 'parse',
        message: err.message,
        details: err,
      })
      return this
    }
  }

  // -------------------------
  // DEFAULTS
  // -------------------------
  default(defaults: Partial<T> = {} as any): this {
    this._parsed = deepmerge2(defaults, this._parsed ?? {})
    return this
  }

  // -------------------------
  // VALIDATION (placeholder hook)
  // -------------------------
  validate(validator?: (input: any) => T): this {
    try {
      if (validator) {
        this._config = validator(this._parsed)
      } else {
        this._config = this._parsed
      }

      return this
    } catch (err: any) {
      this._errors.push({
        stage: 'validate',
        message: err.message,
        details: err,
      })

      return this
    }
  }

  // -------------------------
  // BUILD
  // -------------------------
  build(): T {
    if (!this._raw) {
      throw new Error('load() has not been called')
    }

    if (!this._parsed) {
      throw new Error('parse() has not been called')
    }

    if (this._errors.length) {
      throw new Error(`Config parsing failed:\n` + this._errors.map((e) => `[${e.stage}] ${e.message}`).join('\n'))
    }

    return this._config as T
  }
}
