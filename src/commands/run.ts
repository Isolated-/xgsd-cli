import {Args, Command, Flags} from '@oclif/core'
import {resolve} from 'path'
import {readJsonSync} from 'fs-extra'
import {BaseCommand} from '../base'
import {runProject} from '../@runtime'

export default class Run extends BaseCommand<typeof Command> {
  static override args = {
    function: Args.string({
      description: 'function to run',
      required: true,
    }),
  }
  static override enableJsonFlag: boolean = true
  static override description =
    'Run workflows and your code with full confidence. Error handling, retries, timeouts, and isolation - all built in.'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    data: Flags.string({
      char: 'd',
      description: 'data file to use (must be a path)',
      exists: true,
      required: false,
      parse: (input) => {
        return readJsonSync(input)
      },
    }),

    concurrency: Flags.integer({
      char: 'c',
      description: 'maximum number of concurrent processes (only for async mode)',
      required: false,
      max: 32,
      min: 1,
    }),

    lite: Flags.boolean({
      default: undefined,
    }),
  }

  public async run(): Promise<any> {
    const flags = this.flags!
    const args = this.args!

    const path = resolve(args.function)
    const userModulePath = path

    const data = flags.data as any

    try {
      await runProject({
        data,
        config: {
          package: userModulePath,
        },
      })
    } catch (e: any) {
      if (e.message) {
        this.error(e.message)
      } else {
        this.error('An unknown error occurred')
      }
    }
  }
}
