import {pathExistsSync, readFileSync, readJsonSync} from 'fs-extra'
import {load} from 'js-yaml'
import {join} from 'path'

export const XGSD_CONFIG_FILE_NAME: string = '.xgsd' as const
export const XGSD_CONFIG_FILE_EXTS: string[] = ['json', 'yaml', 'yml'] as const

export type ConfigOpts = {throw: boolean}

type CliConfigBundlerCacheStrategy = 'auto' | 'change' | 'never'

export type CliConfig = {
  bundler: {
    cache: {
      strategy: CliConfigBundlerCacheStrategy
    }
    enabled: boolean
  }
  metrics: {
    enabled: boolean
  }
}

export type BundlerCacheStrategy = 'auto' | 'change' | 'never'
export type BundlerConfig = {
  enabled?: boolean
  cache?: {
    strategy?: BundlerCacheStrategy
  }
}

export class ConfigFile {
  public _content!: Record<string, unknown>

  constructor(
    public readonly cwd: string,
    private readonly opts: ConfigOpts = {throw: false},
  ) {}

  load() {
    const path = join(this.cwd, XGSD_CONFIG_FILE_NAME)

    let found = undefined
    for (const ext of XGSD_CONFIG_FILE_EXTS) {
      let p = `${path}.${ext}`
      if (pathExistsSync(p)) {
        found = p
      }
    }

    if (!found && this.opts.throw) {
      throw new Error(`${path} could not be found`)
    }

    if (!found && !this.opts.throw) {
      return this
    }

    let content: Record<string, unknown>
    try {
      content = readJsonSync(found!)
    } catch {
      content = load(readFileSync(found!).toString()) as Record<string, unknown>
    }

    this._content = content

    return this
  }

  exists(key: string): boolean {
    return key in this._content
  }

  get<T extends Record<string, unknown>>(key: string, defaults?: Partial<T>): T {
    const content = this._content ?? {}
    return {...defaults, ...(content[key] as T)}
  }

  merge(other: ConfigFile): this {
    this._content = {
      ...other._content,
      ...this._content,
    }

    return this
  }
}

export const configFile = (cwd: string) => new ConfigFile(cwd, {throw: false}).load()
