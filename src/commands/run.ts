import {Command, Flags} from '@oclif/core'
import {join} from 'path'
import {BaseCommand} from '../base'
import {bootstrap, createConfig, composePresetWithOpts} from '@xgsd/runtime'
import {debugPreset} from '../presets/debug.preset'
import {defaultPreset} from '../presets/default.preset'
import {developmentPreset} from '../presets/development.preset'
import * as path from 'path'
import {createValidationSchema, resolvePackageJson} from '../util'

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
    }),

    path: Flags.string({
      char: 'p',
      description: 'path to your project (will override config path + entry)',
      aliases: ['project', 'projectPath'],
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

    const config = createConfig({
      configPath,
      packageJsonPath: packageJson,
      validator,
    })

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

      return result
    } catch (e: any) {
      if (e.stack) this.log(e.stack)

      if (e.message) {
        this.error(e.message)
      } else {
        this.error('An unknown error occurred')
      }
    }
  }
}
