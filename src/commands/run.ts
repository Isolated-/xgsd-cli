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

    // TODO: move bundle/cache off of this interface
    // and use xgsd.yaml in project file instead
    bundle: Flags.boolean({
      char: 'b',
      description: 'bundle your code before running your project (makes xGSD more portable)',
      default: false,
      allowNo: true,
    }),

    cache: Flags.boolean({
      char: 'C',
      description: 'cache built artifacts to speed up project runs',
      default: false,
      allowNo: true,
      dependsOn: ['bundle'],
    }),

    legacy: Flags.boolean(),
  }

  public async run(): Promise<any> {
    const flags = this.flags!
    const spanStart = performance.now()

    const projectPath = this.flags.path ? path.resolve(this.flags.path) : process.cwd()
    const mode = flags.legacy ? 'in-process' : 'process'

    if (flags.legacy && (flags.bundle || flags.cache || flags.local)) {
      this.warn(`--bundle, --cache, and --local have no effect with --legacy`)
    }

    if (flags.bundle) {
      this.warn(`--bundle flag will be removed by v1.0.0, create a xgsd.yaml in your project.`)
    }

    if (flags.cache) {
      this.warn(`--cache flag will be removed by v1.0.0, create a xgsd.yaml in your project.`)
    }

    const runner = new ProjectRunner({
      projectPath,
      flags: {
        ...flags,
        bundle: flags.legacy ? false : flags.bundle,
        cache: flags.legacy ? false : flags.cache,
        local: flags.legacy ? false : flags.local,
      },
      context: {
        spanStart,
      },
      mode,
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
