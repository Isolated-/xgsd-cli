import * as path from 'path'
import {calculateModuleGraphHash, ModuleGraph} from './graph'
import {builtinModules} from 'node:module'

export class BundlerGraphView {
  constructor(private graph: ModuleGraph) {}

  build(): {out: Record<string, any>; uses: string[]; entry: string} {
    const out: Record<string, any> = {}
    const uses = new Set()

    for (const [name, data] of Object.entries(this.graph.externals)) {
      if (!data.version) continue

      out[name] = {
        version: data.version ?? 'builtin',
        uses: data.specifiers,
      }

      if (!uses.has(name)) uses.add(name)
    }

    return {out, uses: [...uses] as string[], entry: this.graph.entry}
  }
}

const toRelative = (p: string, root: string) => (p.startsWith('/') ? path.relative(path.dirname(root), p) : p)

export class SummaryGraphView {
  constructor(private graph: ModuleGraph) {}

  build() {
    const root = this.graph.entry

    const manifestVersion = 1
    const entry = toRelative(this.graph.entry, root)
    const totalModules = Object.keys(this.graph.nodes).length

    const uses = this.buildExternals()
    const dependencyGraph = this.buildDependencyGraph()
    const symbols = this.buildSymbols()
    const hash = calculateModuleGraphHash(this.graph)

    return {
      manifestVersion,
      hash,
      entry,
      totalModules,
      uses,
      dependencyGraph,
      symbols,
    }
  }

  private buildSymbols() {
    const symbols: Record<string, any> = {}

    for (const [file, node] of Object.entries(this.graph.nodes)) {
      const relFile = toRelative(file, this.graph.entry)
      symbols[relFile] = node.symbols
        .filter((e) => e.kind !== 'variable')
        .map((e) => ({name: e.name, type: e.kind, async: e.async}))
    }

    return symbols
  }

  private buildExternals() {
    // flattern externals
    let out: any = {}
    const uses = new Set()
    for (const [name, data] of Object.entries(this.graph.externals)) {
      if (builtinModules.includes(name)) continue
      if (uses.has(name)) continue

      uses.add(name)
      const key = `${name}@${data.version}`
      out[key] = [...data.specifiers].map((s: any) => s.imported).sort()
    }

    return out
  }

  private buildDependencyGraph() {
    const {graph} = this
    const root = graph.entry

    const toRelative = (p: string) => {
      if (typeof p !== 'string') return p
      return p.startsWith('/') ? path.relative(path.dirname(root), p) : p
    }

    const dependencyGraph: Record<string, any[]> = {}

    const seen = new Set<string>()

    for (const [file, node] of Object.entries(graph.nodes)) {
      const relFile = toRelative(file)

      if (!dependencyGraph[relFile]) {
        dependencyGraph[relFile] = []
      }

      const pushEdge = (source: string, specifiers: any[], kind: string) => {
        const key = `${relFile}->${source}::${kind}`

        // optional dedupe (VERY useful for large graphs)
        if (seen.has(key)) return
        seen.add(key)

        dependencyGraph[relFile].push({
          source: toRelative(source),
          specifiers: specifiers.map((s) => s.imported ?? s.local ?? s).sort(),
          kind,
        })
      }

      // -------------------------
      // imports
      // -------------------------
      for (const imp of node.imports || []) {
        if (!imp?.source) continue

        pushEdge(imp.source, imp.specifiers || [], 'import')
      }

      // -------------------------
      // exports (rare but keep for consistency)
      // -------------------------
      for (const ex of node.exports || []) {
        if (!ex?.source) continue

        pushEdge(ex.source, ex.specifiers || [], 'export')
      }

      // -------------------------
      // reexports
      // -------------------------
      for (const re of node.reexports || []) {
        if (!re?.source) continue

        pushEdge(re.source, re.specifiers || [], 'reexport')
      }
    }

    return dependencyGraph
  }
}
