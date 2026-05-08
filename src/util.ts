import {pathExistsSync} from 'fs-extra'
import * as path from 'path'
import * as Joi from 'joi'
import {EnvVars, getEnvVarBool} from './constants'

export function resolvePackageJson(input: string): string {
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
        if (pathExistsSync(candidate)) return candidate
        dir = path.dirname(dir)
      }

      throw new Error(`package.json not found for ${input}`)
    } catch (err: any) {
      throw new Error(`Cannot resolve package.json for "${input}"`)
    }
  }
}

export const bundledConfigDefaults = {
  options: {backoff: 'exponential', retries: 3, timeout: 5000},
  mode: 'async',
  concurrency: 4,
  env: null,
  data: null,
  metadata: null,
  blocks: [],
}

export function createValidationSchema(partialDefaults: any = bundledConfigDefaults): Joi.Schema {
  const defaults = {...bundledConfigDefaults, ...partialDefaults}
  const options = Joi.object({
    backoff: Joi.string().valid('linear', 'exponential', 'squaring').default(defaults.options.backoff),
    retries: Joi.number().greater(0).default(defaults.options.retries),
    timeout: Joi.alt(Joi.number().greater(0), Joi.string()).default(defaults.options.timeout),
  }) //.default(defaults.options)

  // TODO: move this to .xgsd.json
  const metrics = Joi.object({
    enabled: Joi.boolean(),
    //url: Joi.string().uri(),
    //urls: Joi.array().items(Joi.string().uri()),
    //accept: Joi.array().items(Joi.string().valid('basic')),
  })

  const block = Joi.object({
    run: Joi.string().required(),
    name: Joi.string(),
    description: Joi.string(),
    version: Joi.alt(Joi.string(), Joi.number()),
    input: Joi.object(),
    env: Joi.object(),
    options,
    metadata: Joi.object(),
    //instances: Joi.number().min(1).max(100).default(1),
  })

  const schema = Joi.object({
    name: Joi.string(),
    description: Joi.string(),
    version: Joi.alt(Joi.string(), Joi.number()),
    entry: Joi.string(),
    mode: Joi.string().valid('async', 'chain').default(defaults.mode),
    metadata: Joi.object().default(defaults.metadata),
    metrics,
    options,
    env: Joi.object().default(defaults.env),
    data: Joi.object().default(defaults.data),
    concurrency: Joi.number().greater(0).less(32).default(defaults.concurrency),
    blocks: Joi.array().items(block).default(defaults.blocks).min(1).max(999),
  })
    .unknown(true)
    .strip(false)

  return schema
}

function bannerLines(object: Record<string, string>) {
  const lines = []
  lines.push(' * xGSD bundle.js')
  for (const key of Object.keys(object)) {
    lines.push(` * ${key}: ${object[key]}`)
  }
  lines.push(' * WARNING: this file is generated. Do not edit manually.')
  return lines.join('\r\n')
}

export function resolvePath(moduleName: string, root: string): string {
  return require.resolve(moduleName, {
    paths: [root],
  })
}

/**
 *  used to migrate dependencies to peer dependencies without breaking projects
 *  tries to find dependency locally before falling back to @xgsd/cli
 *  @param dependency
 *  @param projectRoot
 */
export function resolveDependency(dependency: string, projectRoot: string): {source: string; module: any} {
  try {
    const localPath = resolvePath(dependency, projectRoot)

    return {
      source: 'project',
      module: require(localPath),
    }
  } catch {}

  try {
    const bundledPath = require.resolve(dependency)
    return {
      source: 'cli',
      module: require(bundledPath),
    }
  } catch {}

  throw new Error(
    `Could not resolve ${dependency}.\nInstall it with \`yarn add ${dependency}\` or re-install @xgsd/cli.`,
  )
}

export function resolveDependencyWithWarning(module: string, projectRoot: string, removal: string = '1.0.0') {
  const mod = resolveDependency(module, projectRoot)

  const envVar = getEnvVarBool(EnvVars.CLI_NO_WARNINGS)

  if (envVar) return mod.module

  /*if (mod.source === 'cli') {
    warn(
      `"${module} can be installed inside your project with \`yarn add ${module}\`. Set XGSD_NO_WARNINGS=1 to silence this warning.`,
    )
  }*/

  return mod.module
}

export async function bundle(options: {
  entry: string
  out: string
  format: 'esm' | 'cjs'
  banner: Record<string, string>
  dependencies: string[]
}) {
  const {dependencies} = options

  const esbuild = resolveDependencyWithWarning('esbuild', path.dirname(options.entry))
  if (esbuild.version) {
    console.log(`building with esbuild@${esbuild.version}`)
  }

  return esbuild.build({
    keepNames: true,
    entryPoints: [options.entry],
    bundle: true,
    platform: 'node',
    outfile: options.out,
    format: options.format,
    minify: false,
    sourcemap: false,
    external: dependencies,
    banner: {
      js: `
/**
${bannerLines(options.banner)}
 */
`.trim(),
    },
  })
}
