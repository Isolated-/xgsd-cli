import {pathExistsSync, readJsonSync, writeJsonSync} from 'fs-extra'
import prettyMs from 'pretty-ms'
import {bundle, resolveDependencyWithWarning} from './util'
import {debugPreset} from './presets/debug.preset'
import {defaultPreset} from './presets/default.preset'
import {developmentPreset} from './presets/development.preset'
import {createHash, timingSafeEqual} from 'node:crypto'
import {readdir, readFile, stat} from 'node:fs/promises'
import path, {join, relative, sep} from 'node:path'

export async function initialiseBootstrap(projectPath: string, opts: any, activation: string = 'cli') {
  const {bootstrap, composePresetWithOpts} = resolveDependencyWithWarning('@xgsd/runtime', projectPath)

  const presets = [defaultPreset]

  if (opts.runtime?.debug) {
    presets.push(debugPreset)
  }

  if (!opts.runtime?.process.enabled) {
    presets.push(developmentPreset)
  }

  const result = await bootstrap({
    projectPath,
    config: opts.config,
    activation,
    preset: composePresetWithOpts({
      presets,
      opts: {
        metrics: opts.metrics?.enabled,
        createReport: opts.runtime?.save,
        debug: opts.runtime?.debug,
      },
    }),
  })

  return result
}

export type WalkedFile = {
  path: string
  hash: string
  size: number
}

type WalkOptions = {
  ignore?: string[]
  filter?: (path: string) => boolean
}

export async function calculateProjectHash(project: string): Promise<string> {
  const hashes = await collectProjectHashes(project, {
    ignore: ['node_modules', '.xgsd', 'dist', '.git'],
    filter: (path) => path.endsWith('.js') || path.endsWith('.ts'),
  })

  const normalised = hashes
    .map((h) => h.hash.trim().slice(0, 9))
    .sort()
    .join('|')

  return createHash('sha256').update(normalised).digest('hex')
}

export async function collectProjectHashes(projectPath: string, options: WalkOptions = {}): Promise<WalkedFile[]> {
  const {ignore = ['node_modules'], filter = () => true} = options

  const files: WalkedFile[] = []

  const ignored = new Set(ignore)

  const shouldIgnore = (target: string) => {
    const parts = relative(projectPath, target).split(sep)

    return parts.some((part) => ignored.has(part))
  }

  const hashFile = async (filePath: string) => {
    const buffer = await readFile(filePath)

    return createHash('sha256').update(buffer).digest('hex')
  }

  const visit = async (current: string): Promise<void> => {
    if (shouldIgnore(current)) {
      return
    }

    const entries = await readdir(current)

    for (const entry of entries) {
      const fullPath = join(current, entry)

      if (shouldIgnore(fullPath)) {
        continue
      }

      const info = await stat(fullPath)

      if (info.isDirectory()) {
        await visit(fullPath)
        continue
      }

      if (!info.isFile()) {
        continue
      }

      const path = relative(projectPath, fullPath)

      if (!filter(path)) {
        continue
      }

      files.push({
        path,
        hash: await hashFile(fullPath),
        size: info.size,
      })
    }
  }

  await visit(projectPath)

  return files.sort((a, b) => a.path.localeCompare(b.path))
}

export function safeHashCompare(a: string, b: string): boolean {
  const abuf = Buffer.from(a, 'hex')
  const bbuf = Buffer.from(b, 'hex')

  return timingSafeEqual(abuf, bbuf)
}

export async function createBundle({
  project,
  entry,
  cache,
  log,
}: {
  project: string
  entry: string
  cache: boolean
  log?: boolean
}): Promise<string> {
  const start = performance.now()

  const xgsd = join(project, '.xgsd')
  const out = join(xgsd, 'bundle.js')
  const entryFile = join(project, entry)
  const packageJsonPath = join(project, 'package.json')
  const outPathRel = join('.xgsd', 'bundle.js')

  // v0.7 note
  // dont do this as it adds 20-30MB of memory before anything even runs
  // bundling is fine but current AST parsing/traversal is unneeded
  // instead split into two concerns: dependencies (from package.json) and code changes (from hashes)
  // do this instead:
  const hash = await calculateProjectHash(project)
  const outdir = path.dirname(out)

  const packageJson = readJsonSync(packageJsonPath)

  const outPackageJsonPath = join(outdir, 'package.json')

  if (pathExistsSync(outPackageJsonPath) && pathExistsSync(out) && cache) {
    const outPackageJson = readJsonSync(outPackageJsonPath)

    if (outPackageJson.hash && safeHashCompare(outPackageJson.hash, hash)) {
      // cache hit
      if (log) console.log(`${outPathRel} loaded from cache (use --no-cache or delete it to force bundling)`)
      return outPathRel
    }
  }

  const dependencies = Object.entries(readJsonSync(packageJsonPath).dependencies).map((d) => d[0])

  // for now let esbuild notify of errors
  await bundle({
    entry: entryFile,
    out,
    banner: {
      generated: new Date().toISOString(),
      hash,
    },
    format: 'esm',
    dependencies,
  })

  writeJsonSync(path.join(outdir, 'package.json'), {
    ...packageJson,
    hash,
    type: 'module',
  })

  if (log) console.log(`package.json written to .xgsd/package.json`)

  const ms = performance.now() - start

  if (log) console.log(`${entry} bundled to ${outPathRel} in ${prettyMs(ms)}`)

  return outPathRel
}
