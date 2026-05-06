import {Command, Flags} from '@oclif/core'
import {join} from 'path'
import {BaseCommand} from '../base'
import {debugPreset} from '../presets/debug.preset'
import {defaultPreset} from '../presets/default.preset'
import {developmentPreset} from '../presets/development.preset'
import * as path from 'path'
import {bundle, createValidationSchema, resolvePackageJson, resolveDependencyWithWarning} from '../util'

export async function createBundle({project, entry}: {project: string; entry: string}): Promise<string> {
  const out = join(project, '.xgsd', 'bundle.js')
  const entryFile = join(project, entry)
  const packageJsonPath = join(project, 'package.json')

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

  return join('.xgsd', 'bundle.js')
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
      default: false,
      allowNo: true,
    }),
  }

  public async run(): Promise<any> {
    const flags = this.flags!

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
      config.entry = await createBundle({project: projectPath, entry: flags.entry ?? config.entry})
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
      })

      this.log(`finished running your project, use --json to view the result of runs.`)
      if (flags.save) {
        this.log(`saved result to ${join(projectPath, result.end + '.json')}`)
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
