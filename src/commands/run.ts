import {Args, Command, Flags} from '@oclif/core'
import {resolve} from 'path'
import {readJsonSync} from 'fs-extra'
import {BaseCommand} from '../base'
import {bootstrap, RuntimePreset, RuntimePresetFunction} from '../@runtime/bootstrap'
import {debugPreset} from '../presets/debug.preset'
import {defaultPreset} from '../presets/default.preset'
import {developmentPreset} from '../presets/development.preset'
import ora from 'ora'

// this will live in sdk
function composePreset(...presets: RuntimePresetFunction[]): RuntimePreset {
  const compiled: RuntimePreset[] = presets.map((p) => p())

  return {
    loggers: compiled.flatMap((p) => p.loggers ?? []),
    plugins: compiled.flatMap((p) => p.plugins ?? []),
    executor: compiled.reverse().find((p) => p.executor)?.executor,
  }
}

export default class Run extends BaseCommand<typeof Command> {
  static override args = {
    function: Args.string({
      description: 'function to run',
      required: true,
    }),
  }
  static override enableJsonFlag: boolean = true
  static override description = ''
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    debug: Flags.boolean({
      char: 'D',
      description: 'verbose debug information is printed when this option is used.',
      aliases: ['verbose'],
    }),
    development: Flags.boolean({
      description: '--lite has been replaced by this option. Uses no process isolation for faster runs',
      char: 'd',
      aliases: ['dev', 'local'],
    }),
  }

  public async run(): Promise<any> {
    const flags = this.flags!
    const args = this.args!
    const userModulePath = resolve(args.function)

    try {
      const presets: any[] = [defaultPreset]
      if (flags.debug) {
        presets.push(debugPreset)
      }

      if (flags.development) {
        presets.push(developmentPreset)
      }

      let spinner
      if (!flags.silent) {
        spinner = ora('running your project').start()
      }

      // new way
      await bootstrap({
        packagePath: userModulePath,
        preset: composePreset(...presets),
      })

      spinner?.stop()
    } catch (e: any) {
      if (e.message) {
        this.error(e.message)
      } else {
        this.error('An unknown error occurred')
      }
    }
  }
}
