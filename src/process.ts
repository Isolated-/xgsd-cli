import {bootstrap, createConfig} from '@xgsd/runtime'
import {join} from 'path'
import {bundle, resolveDependencyWithWarning} from './util'
import {defaultPreset} from './presets/default.preset'
import {debugPreset} from './presets/debug.preset'
import {developmentPreset} from './presets/development.preset'
import {BundlerGraphView, SummaryGraphView} from './graph/summary'
import {pathExistsSync, readJsonSync, writeJsonSync} from 'fs-extra'
import prettyMs from 'pretty-ms'
import {buildGraph} from './graph/graph'

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

const {XGSD_PROJECT_PATH} = process.env

const projectPath = XGSD_PROJECT_PATH!
const configPath = join(projectPath, 'config.yaml')

async function main() {
  const {bootstrap, createConfig, composePresetWithOpts} = resolveDependencyWithWarning('@xgsd/runtime', projectPath)

  const config = createConfig({
    configPath,
    packageJsonPath: join(projectPath, 'package.json'),
    validator: (input: any) => input,
  })

  config.entry = await createBundle({
    project: projectPath,
    entry: config.entry,
    cache: true,
    log: true,
  })

  const result = await bootstrap({
    projectPath,
    config,
    activation: 'cli',
    preset: composePresetWithOpts({
      presets: [defaultPreset],
      opts: {
        metrics: false,
        createReport: true,
        debug: false,
      },
    }),
  })

  return result
}
main()
  .then(async (result) => {
    //console.log(result)

    // allow microtasks / flush hooks
    await new Promise((r) => setImmediate(r))

    process.send?.({type: 'XGSD_DONE', result})

    //process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
