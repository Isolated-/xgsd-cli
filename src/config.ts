import {pathExistsSync, readFileSync, readJsonSync} from 'fs-extra'
import {load} from 'js-yaml'
import {join} from 'path'

export const XGSD_CONFIG_FILE_NAME: string = 'xgsd' as const
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

export function resolveFilePath(file: string, exts: string[], cwd: string): string | null {
  const base = join(cwd, file)

  for (const ext of exts) {
    const path = `${base}.${ext}`

    // return first found
    if (pathExistsSync(path)) {
      return path
    }
  }

  return null
}

export class ConfigFile {
  public _content!: Record<string, unknown>

  constructor(
    public readonly cwd: string,
    private readonly opts: ConfigOpts = {throw: false},
  ) {}

  load() {
    const path = join(this.cwd, XGSD_CONFIG_FILE_NAME)

    let found = resolveFilePath(XGSD_CONFIG_FILE_NAME, XGSD_CONFIG_FILE_EXTS, this.cwd)

    if (!found && this.opts.throw) {
      throw new Error(`${path} could not be found`)
    }

    if (!found && !this.opts.throw) {
      return this
    }

    if (found?.endsWith('.json')) {
      this._content = readJsonSync(found)
    } else {
      this._content = load(readFileSync(found!).toString()) as Record<string, unknown>
    }

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
