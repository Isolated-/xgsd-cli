import {Command, Flags} from '@oclif/core'
import {join} from 'path'
import {BaseCommand} from '../base'
import {debugPreset} from '../presets/debug.preset'
import {defaultPreset} from '../presets/default.preset'
import {developmentPreset} from '../presets/development.preset'
import path from 'path'
import {bundle, createValidationSchema, resolvePackageJson, resolveDependencyWithWarning} from '../util'
import {pathExistsSync} from 'fs-extra'
import {prettyMs} from '../plugins/debug.plugin'

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
  const out = join(project, '.xgsd', 'bundle.js')
  const entryFile = join(project, entry)
  const packageJsonPath = join(project, 'package.json')
  const outPathRel = join('.xgsd', 'bundle.js')

  if (pathExistsSync(out) && cache) {
    if (log) console.log(`${outPathRel} loaded from cache (use --no-cache or delete it to force bundling)`)
    return outPathRel
  }

  const start = performance.now()

  // for now let esbuild notify of errors
  await bundle({
    packageJsonPath,
    entry: entryFile,
    out,
    banner: {
      generated: new Date().toISOString(),
    },
    format: 'esm',
  })

  const ms = performance.now() - start

  if (log) console.log(`${entry} bundled to ${outPathRel} in ${prettyMs(ms)}`)

  return outPathRel
}

export default class Run extends BaseCommand<typeof Command> {
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

    const validator = (input: any) => {
      const validation = createValidationSchema().validate(input)

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

    if (flags.bundle) {
      config.entry = await createBundle({
        project: projectPath,
        entry: flags.entry ?? config.entry,
        cache: flags.cache,
        log: !flags.json,
      })
    }

    const metrics = !flags.metrics ? false : (config.metrics?.enabled ?? flags.metrics)
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
            metrics,
          },
          presets,
        }),
        spanStart,
      })

      if (flags.save) {
        this.log(`saved result to ${join(projectPath, result.end + '.json')}`)
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
