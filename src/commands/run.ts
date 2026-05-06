import {Command, Flags} from '@oclif/core'
import {join} from 'path'
import {BaseCommand} from '../base'
import {debugPreset} from '../presets/debug.preset'
import {defaultPreset} from '../presets/default.preset'
import {developmentPreset} from '../presets/development.preset'
import path from 'path'
import {bundle, createValidationSchema, resolvePackageJson, resolveDependencyWithWarning} from '../util'
import {pathExistsSync, readJsonSync, writeJsonSync} from 'fs-extra'
import {prettyMs} from '../plugins/debug.plugin'
import {buildGraph} from '../graph/graph'
import {BundlerGraphView, SummaryGraphView} from '../graph/summary'
import {BundlerConfig, configFile, ConfigFile} from '../config'

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

export default class Run extends BaseCommand<typeof Run> {
  static override args = {}
  static override description = 'run your xGSD project'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    debug: Flags.boolean({
      char: 'd',
      description: 'verbose debug information is printed when this option is used.',
      aliases: ['verbose'],
    }),

    local: Flags.boolean({
      description: '--lite has been replaced by this option. Uses no process isolation for faster runs',
      char: 'l',
      aliases: ['dev', 'development', 'local', 'fast'],
    }),

    config: Flags.string({
      char: 'c',
      description: 'path to your configuration file (defaults to config.yaml)',
      default: 'config.yaml',
    }),

    save: Flags.boolean({
      char: 's',
      allowNo: true,
      default: true,
      description: 'when false/--no-save is used, no report will be saved to runs/{date}.json',
    }),

    path: Flags.string({
      char: 'p',
      description: 'path to your project (will override config path + entry)',
      aliases: ['project', 'projectPath'],
    }),

    bundle: Flags.boolean({
      char: 'b',
      description: 'bundle your code before running your project (makes xGSD more portable)',
      default: true,
      allowNo: true,
    }),

    cache: Flags.boolean({
      char: 'C',
      description: 'cache built artifacts to speed up project runs',
      default: true,
      allowNo: true,
      dependsOn: ['bundle'],
    }),
  }

  public async run(): Promise<any> {
    const flags = this.flags!

    const spanStart = performance.now()

    const projectPath = this.flags.path ? path.resolve(this.flags.path) : process.cwd()
    const packageJson = resolvePackageJson(projectPath)
    const configPath = join(projectPath, flags.config)

    const globalCli = configFile(this.config.configDir)
    const cli = configFile(projectPath)
    cli.merge(globalCli)

    const bundler = cli.get<BundlerConfig>('bundler', {
      enabled: flags.bundle,
      cache: {
        strategy: flags.cache ? 'change' : 'never',
      },
    })

    const validator = (input: any) => {
      const validation = createValidationSchema(cli.get('defaults')?.config).validate(input)

      if (validation.error) {
        this.error(`config validation failed: ${validation.error.details[0].message}`)
      }

      return validation.value
    }

    const {bootstrap, createConfig, composePresetWithOpts} = resolveDependencyWithWarning('@xgsd/runtime', projectPath)

    const config = createConfig({
      configPath,
      packageJsonPath: packageJson,
      validator,
    })

    if (bundler.enabled) {
      config.entry = await createBundle({
        project: projectPath,
        entry: config.entry,
        cache: bundler.cache?.strategy !== 'never' ? true : false,
        log: !flags.json,
      })
    }

    const metrics = cli.get<{enabled: boolean}>('metrics', {enabled: flags.metrics})
    const presets: any[] = [defaultPreset]

    if (flags.debug) {
      presets.push(debugPreset)
    }

    if (flags.local) {
      presets.push(developmentPreset)
    }

    try {
      const result = await bootstrap({
        data: this.data,
        activation: 'cli',
        projectPath,
        config,
        preset: composePresetWithOpts({
          opts: {
            createReport: flags.save,
            metrics: metrics.enabled,
            debug: flags.debug,
          },
          presets,
        }),
        spanStart,
      })

      if (flags.save) {
        this.log(`saved result to ${join('runs', result.end + '.json')}`)
      }

      if (result.state === 'failed') {
        this.warn(`your project ended in a failed state, check logs for more info`)
      } else {
        this.log(`finished running your project, use --json to view the result of runs`)
      }

      return result
    } catch (e: any) {
      if (e.stack) this.error(e.stack)

      if (e.message) {
        this.error(e.message)
      } else {
        this.error('An unknown error occurred')
      }
    }
  }
}
