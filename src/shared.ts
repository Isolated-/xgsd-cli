import {pathExistsSync, readJsonSync, writeJsonSync} from 'fs-extra'
import {join} from 'path'
import prettyMs from 'pretty-ms'
import {buildGraph} from './graph/graph'
import {SummaryGraphView, BundlerGraphView} from './graph/summary'
import {bundle} from './util'

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

  const summaryPath = join(xgsd, 'summary.json')
  const graph = await buildGraph(entryFile)
  const summary = new SummaryGraphView(graph).build()
  const bundlerView = new BundlerGraphView(graph).build()

  if (pathExistsSync(summaryPath) && cache) {
    const json = readJsonSync(summaryPath)

    if (json.hash === summary.hash) {
      if (log) console.log(`${outPathRel} loaded from cache (use --no-cache or delete it to force bundling)`)
      return outPathRel
    }

    if (log) console.log(`${outPathRel} is out of date - rebuilding`)
  }

  // for now let esbuild notify of errors
  await bundle({
    packageJsonPath,
    entry: entryFile,
    out,
    banner: {
      generated: new Date().toISOString(),
      hash: summary.hash,
    },
    format: 'esm',
    dependencies: bundlerView.uses,
  })

  writeJsonSync(summaryPath, summary, {spaces: 2})
  if (log) console.log(`summary written to .xgsd/summary.json`)

  const ms = performance.now() - start

  if (log) console.log(`${entry} bundled to ${outPathRel} in ${prettyMs(ms)}`)

  return outPathRel
}
