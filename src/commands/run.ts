import {Flags} from '@oclif/core'
import {join} from 'path'
import {BaseCommand} from '../base'
import path from 'path'
import {ProjectRunner} from '../runner'

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

    const runner = new ProjectRunner({
      projectPath,
      flags,
      context: {
        spanStart,
      },
    })

    try {
      const result = await runner.run()

      if (flags.save) {
        this.log(`saved result to ${join('runs', result.end + '.json')}`)
      }

      if (result.state === 'failed') {
        this.warn(`your project ended in a failed state, check logs for more info`)
      } else {
        this.log(`finished running your project, use --json to view the result of runs`)
      }

      return result
    } catch (error: any) {
      if (error.stack) this.error(error.stack)

      this.error(error.message ? error.message : error)
    }
  }
}
