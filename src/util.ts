import {ensureDirSync, pathExistsSync, readJsonSync, writeJsonSync} from 'fs-extra'
import * as path from 'path'
import * as Joi from 'joi'
import {warn} from '@oclif/core/errors'
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

export function createValidationSchema(): Joi.Schema {
  const options = Joi.object({
    backoff: Joi.string().valid('linear', 'exponential', 'squaring').default('exponential'),
    retries: Joi.number().greater(0).default(3),
    timeout: Joi.alt(Joi.number().greater(0), Joi.string()).default(5000),
  }).default({
    backoff: 'exponential',
    retries: 3,
    timeout: 5000,
  })

  const metrics = Joi.object({
    enabled: Joi.boolean(),
    //url: Joi.string().uri(),
    //urls: Joi.array().items(Joi.string().uri()),
    accept: Joi.array().items(Joi.string().valid('basic')),
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
    instances: Joi.number().min(1).max(100).default(1),
  })

  const schema = Joi.object({
    name: Joi.string(),
    description: Joi.string(),
    version: Joi.alt(Joi.string(), Joi.number()),
    entry: Joi.string(),
    mode: Joi.string().valid('async', 'chain'),
    metadata: Joi.object(),
    metrics,
    options,
    env: Joi.object(),
    data: Joi.object(),
    concurrency: Joi.number().greater(0).less(32),
    blocks: Joi.array().items(block),
  })

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
  packageJsonPath: string
  entry: string
  out: string
  format: 'esm' | 'cjs'
  banner: Record<string, string>
}) {
  const {packageJsonPath} = options
  const json = readJsonSync(packageJsonPath)

  const esbuild = resolveDependencyWithWarning('esbuild', path.dirname(options.entry))
  if (esbuild.version) {
    console.log(`building with esbuild@${esbuild.version}`)
  }

  const dependencies = []
  if (json.dependencies) {
    for (const [item] of Object.entries(json.dependencies)) {
      dependencies.push(item)
    }
  }

  const outdir = path.dirname(options.out)
  ensureDirSync(outdir)
  writeJsonSync(path.join(outdir, 'package.json'), {
    ...json,
    type: options.format === 'esm' ? 'module' : 'commonjs',
  })

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
