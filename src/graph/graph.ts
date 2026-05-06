import * as path from 'path'
import {ModuleGraphParseStage} from './parser'
import {existsSync, readFileSync} from 'fs'
import {builtinModules} from 'module'
import {createHash} from 'crypto'
import stringify = require('fast-json-stable-stringify')

export type ModuleNode = {
  source: string
  symbols: any[]
  imports: ImportEdge[]
  exports: ExportNode[]
  reexports: ExportNode[]
}

export type ExternalModule = {
  importedBy: string[]
  specifiers: string[]
  name: string | null
  version: string | null
  type: 'builtin' | 'external'
}
export type ModuleGraph = {
  entry: string
  nodes: Record<string, ModuleNode>
  externals: Record<string, ExternalModule>
}

export type ImportEdge = {
  source: string
  specifiers: string[]
}

export type ExportNode = {
  name: string
  source: string
  local: string
  kind: string
  specifiers: string[]
}

export type EdgeKind = 'import' | 'reexport' | 'export_all'

function registerExternal(graph: ModuleGraph, pkgKey: string, fromFile: string, specifiers: string[]) {
  graph.externals[pkgKey] ??= {
    importedBy: [],
    specifiers: [],
    version: null,
    name: null,
    type: 'builtin',
  }

  const ext = graph.externals[pkgKey]

  ext.importedBy.push(fromFile)
  ext.specifiers.push(...specifiers)
  ext.specifiers = dedupe(ext.specifiers).sort()

  // sanity check

  if (ext.version === null) {
    const pkgEntry = resolveImport(fromFile, pkgKey, {allowExternal: true})

    if (pkgEntry) {
      const meta = getPackageVersion(pkgEntry)
      ext.version = meta?.version ?? null
      ext.name = meta?.name ?? null
      ext.type = 'external'
    }
  }
}

export const buildGraph = async (entryFile: string) => {
  const graph: ModuleGraph = {
    entry: path.resolve(entryFile),
    nodes: {},
    externals: {},
  }

  const visited = new Set<string>()

  const visit = (file: string) => {
    const dependencies: string[] = []
    const resolvedFile = path.resolve(file)
    if (visited.has(resolvedFile)) return
    visited.add(resolvedFile)

    const edges: Record<string, {source: string; kind: string}[]> = {}
    const analysis = new ModuleGraphParseStage()
      .parse(resolvedFile)
      .withImports()
      .withExports()
      .withReexports()
      .withSymbols()
      .extract()

    const collectDeps = (items: any[]) => {
      for (const item of items) {
        const resolved = resolveImport(resolvedFile, item.source, {allowExternal: false})

        if (!resolved) {
          registerExternal(graph, normalizePackageName(item.source), resolvedFile, item.specifiers)
          continue
        }

        edges[resolvedFile] ??= []
        edges[resolvedFile].push({
          source: item,
          kind: item.kind,
        })

        visit(resolved)
        dependencies.push(resolved)
      }
    }

    collectDeps(analysis.imports)
    collectDeps(analysis.reexports)

    graph.nodes[resolvedFile] = normaliseNode(resolvedFile, {
      imports: analysis.imports,
      exports: dedupe(analysis.exports).sort(),
      reexports: analysis.reexports,
      symbols: dedupe([
        ...analysis.symbols,
        ...analysis.exports.map((e: {name: string; kind: string}) => ({
          name: e.name,
          kind: e.kind,
        })),
      ]).sort(),
    })
  }

  visit(graph.entry)

  return graph
}

function dedupe(items: any[]): any[] {
  const map = new Map()

  for (const item of items) {
    const key = `${item.name}:${item.local}`

    if (!map.has(key)) {
      map.set(key, item)
    }
  }

  return Array.from(map.values())
}

export function calculateModuleGraphHash(graph: ModuleGraph) {
  return createHash('sha256').update(stringify(graph)).digest('hex')
}

function getPackageVersion(resolvedPath: string) {
  let dir = path.dirname(resolvedPath)

  while (dir !== path.dirname(dir)) {
    const pkgPath = path.join(dir, 'package.json')

    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))

      return {
        name: pkg.name,
        version: pkg.version,
      }
    }

    dir = path.dirname(dir)
  }

  return null
}

export function normalizePackageName(specifier: string): string {
  // 1. Scoped packages (@scope/name)
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/')

    // @scope/pkg/anything → @scope/pkg
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier
  }

  // 2. Non-scoped packages (axios/lib/index.js → axios)
  const parts = specifier.split('/')

  return parts[0]
}

export function resolveImport(from: string, specifier: string, opts?: {allowExternal?: boolean}): string | null {
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    const resolved = path.resolve(path.dirname(from), specifier)

    const withJs = resolved.endsWith('.js') ? resolved : `${resolved}.js`
    const withTs = resolved.endsWith('.ts') ? resolved : `${resolved}.ts`

    if (existsSync(withJs)) return withJs
    if (existsSync(withTs)) return withTs
    if (existsSync(resolved)) return resolved

    return null
  }

  if (builtinModules.includes(specifier) || builtinModules.includes(`node:${specifier}`)) {
    return null
  }

  if (!opts?.allowExternal) {
    return null
  }

  try {
    const resolved = require.resolve(specifier, {
      paths: [path.dirname(from)],
    })

    if (resolved === specifier) return null

    return resolved
  } catch {
    return null
  }
}

function normaliseNode(file: string, node: any) {
  return {
    source: file,
    symbols: (node.symbols || []).sort(),
    imports: (node.imports || []).sort(),
    reexports: (node.reexports || []).sort(),
    exports: (node.exports || []).sort(),
  }
}
