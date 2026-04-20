import * as fs from 'fs-extra'
import * as path from 'path'
import {join} from 'path'
import * as yaml from 'yaml'
import {deepmerge2} from './util/object.util'
import {createRequire} from 'module'
import {v4} from 'uuid'
import {createHash} from 'crypto'
import {SourceData} from '@xgsd/engine'
import {EventBus} from './event'
import {Runnable} from './process/orchestration.process'
import {RunState} from './types/state.types'

// TODO: extract most of this into @xgsd/runtime as staged builders

export function getPackageVersion(input: string): string {
  try {
    const pkgPath = resolvePackageJson(input)
    const json = fs.readJsonSync(pkgPath)

    if (!json?.version || typeof json.version !== 'string') {
      throw new Error(`Missing "version" field in ${pkgPath}`)
    }

    return `v${json.version}`
  } catch (err: any) {
    throw new Error(`package version not resolvable: ${err.message}`)
  }
}

function resolvePackageJson(input: string): string {
  try {
    return require.resolve(`${input}/package.json`, {
      paths: [process.cwd()],
    })
  } catch {
    try {
      const entry = require.resolve(input, {
        paths: [process.cwd()],
      })

      let dir = path.dirname(entry)

      while (dir !== path.dirname(dir)) {
        const candidate = path.join(dir, 'package.json')
        if (fs.pathExistsSync(candidate)) return candidate
        dir = path.dirname(dir)
      }

      throw new Error(`package.json not found for ${input}`)
    } catch (err: any) {
      throw new Error(`Cannot resolve package.json for "${input}"`)
    }
  }
}

export type ParseError = {
  stage: 'load' | 'parse' | 'validate'
  message: string
  details?: unknown
}

export type Context<T extends SourceData = SourceData> = {
  id: string
  hash: string
  name: string
  version: string
  packagePath: string
  mode: string
  lite: boolean
  input: Record<string, unknown>
  output: Record<string, unknown>
  blockCount: number
  blocks: T[]
  state: RunState
  start: string
  end: string | null
  outputPath: string
  bus: EventBus<any>
  env: Record<string, any>
  config: {project: T; blocks: T[]}
}

export type Builder<T> = {
  build(): Promise<T> | T
}

// resolve project() (user project path)
export class ContextSetupStage {
  project(path: string) {
    return new ContextConfigStage({
      packagePath: path,
    })
  }
}

export const createContext = (path: string) => {
  return new ContextSetupStage().project(path)
}

export class ContextConfigStage<T extends Record<string, unknown>> {
  constructor(private ctx: Partial<Context<T>>) {}

  config(config: {project: T; blocks: T[]}): ContextBusStage<T> {
    return new ContextBusStage({
      ...this.ctx,
      config,
    })
  }
}

export class ContextBusStage<T extends Record<string, unknown>> {
  constructor(private ctx: Partial<Context<T>>) {}

  bus(bus: EventBus<any>): ContextFinalStage<T> {
    return new ContextFinalStage({
      ...this.ctx,
      bus,
    })
  }
}

export class ContextFinalStage<T extends Record<string, unknown>> {
  constructor(private ctx: Partial<Context<T>>) {}

  id(generator: () => string = v4): this {
    this.ctx.id = generator()
    return this
  }

  hash(generator?: (data: Buffer) => string): this {
    const data = Buffer.from(JSON.stringify(this.ctx.config))
    this.ctx.hash = generator?.(data) ?? createHash('sha256').update(data).digest('hex').slice(0, 8)
    return this
  }

  version(version?: string): this {
    const v = version ?? (this.ctx.config?.project?.version as string) ?? getPackageVersion(this.ctx.packagePath!)
    this.ctx.version = v
    return this
  }

  name(name?: string): this {
    const n = name ?? (this.ctx.config?.project?.name as string) ?? 'unknown'
    this.ctx.name = n
    return this
  }

  meta(metadata?: {name?: string; version?: string; output?: string}): this {
    if (!this.ctx.id) this.id()
    if (!this.ctx.name) this.name(metadata?.name)
    if (!this.ctx.version) this.version(metadata?.version)
    if (!this.ctx.env) this.env()
    if (!this.ctx.outputPath) this.output(metadata?.output)

    return this
  }

  output(path?: string): this {
    this.ctx.outputPath = path ?? join(this.ctx.packagePath!, 'runs')
    return this
  }

  data(data?: Record<string, unknown>): this {
    const configData = this.ctx.config?.project?.data as T

    if (!data) {
      // load from config only
      this.ctx.input = configData
      return this
    }

    this.ctx.input = deepmerge2(configData, data) as T
    return this
  }

  lite(lite?: boolean) {
    this.ctx.lite = !!lite
    return this
  }

  blocks(): this {
    // already done
    if (this.ctx.blocks) {
      return this
    }

    const blocks = this.ctx.config?.blocks
    this.ctx.blocks = blocks?.map((block) => {
      return createBlockContext(block) as any
    })

    return this
  }

  env(): this {
    this.ctx.env = {
      node: process.version,
      cli: getPackageVersion(process.cwd()),
      engine: getPackageVersion('@xgsd/engine'),
      platform: process.platform,
    }

    return this
  }

  // not strictly needed
  // is used to prevent needing the array of blocks
  // or full context in child processes (see ContextLike)
  blockCount(): this {
    this.ctx.blockCount = this.ctx.blocks?.length
    return this
  }

  build(): Context<T> {
    return this.ctx as Context<T>
  }
}

export type ConfigType = Record<string, unknown>

type ProjectConfig<T extends ConfigType = ConfigType> = {
  data: T
  blocks?: T[]
}

type BlockConfig<T extends ConfigType = ConfigType> = {}

export type BlockContext<T extends SourceData = SourceData> = {
  name: string
  enabled: boolean
  run: string
  options: Record<string, unknown>
  env: Record<string, unknown>
  attempt?: number
  input: T
  output: T
  error: any | null
  state: string
  errors: any[]
  start: string | null
  end: string | null
  duration: number | null
}

export type Block<T extends SourceData = SourceData> = BlockContext<T> & Runnable

export const createBlockContext = (block: Partial<Block>): BlockContext<SourceData> => {
  return new BlockContextBuilderRunStage()
    .run(block.run!)
    .input(block.input ?? {})
    .disable(!block.enabled)
    .state(RunState.Pending)
    .name(block.name)
    .options(block.options)
    .build()
}

export class BlockContextBuilderRunStage {
  run(fnName: string) {
    return new BlockContextBuilderInputStage({
      run: fnName,
    })
  }
}

export class BlockContextBuilderInputStage {
  constructor(private ctx: Partial<BlockContext>) {}

  input(input: Record<string, unknown>) {
    return new BlockContextBuilderDisabledStage({
      ...this.ctx,
      input,
    })
  }
}

export class BlockContextBuilderDisabledStage {
  constructor(private ctx: Partial<BlockContext>) {}

  disable(disabled?: boolean) {
    return new BlockContextBuilderFinalStage({
      ...this.ctx,
      enabled: !disabled,
    })
  }
}

export class BlockContextBuilderFinalStage {
  constructor(private ctx: Partial<BlockContext>) {}

  name(name?: string): this {
    this.ctx.name = name ?? this.ctx.run
    return this
  }

  env(env: Record<string, unknown>): this {
    this.ctx.env = env

    return this
  }

  options(options?: Record<string, unknown>): this {
    this.ctx.options = options ?? {}
    return this
  }

  error(error: Record<string, unknown>): this {
    this.ctx.error = error
    return this
  }

  errors(errors: Record<string, unknown>[]): this {
    this.ctx.errors = errors
    return this
  }

  state(state?: RunState): this {
    this.ctx.state = state ?? RunState.Pending
    return this
  }

  build(): BlockContext {
    return this.ctx as BlockContext
  }
}

export class ConfigParser<T extends ProjectConfig> {
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
  build() {
    if (this._errors.length) {
      throw new Error(this._errors[0].message)
    }

    const snapshot = this._config!
    const {blocks, ...project} = snapshot

    return {
      project,
      blocks,
    }
  }
}
