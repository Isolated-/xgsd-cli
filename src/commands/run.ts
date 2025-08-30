import {Args, Command, Flags} from '@oclif/core'
import {join} from 'path'
import {timedRunnerFn} from '../@core/@shared/runner'
import {pipes} from '../@core/pipelines/pipelines.util'
import {readJsonSync} from 'fs-extra'

export default class Run extends Command {
  static override args = {
    function: Args.string({
      description: 'function to run',
      required: true,
      parse: async (input) => {
        try {
          return require(join(process.cwd(), input))
        } catch (error) {
          throw new Error('unable to find function, does it exist?')
        }
      },
    }),
  }
  static override description = 'describe the command here'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    // flag with no value (-f, --force)
    force: Flags.boolean({char: 'f'}),
    // flag with a value (-n, --name=VALUE)
    name: Flags.string({char: 'n', description: 'name to print'}),
    data: Flags.string({
      char: 'd',
      description: 'data file to use (to use a path, prefix with @)',
      exists: true,
      required: false,
      parse: (input) => {
        if (input.charAt(0) === '@') {
          const data = readJsonSync(input.slice(1))
          return data
        }

        try {
          return JSON.parse(input)
        } catch (_) {
          return input
        }
      },
    }),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Run)

    if (Array.isArray(args.function)) {
      // handle pipeline
      const fns = args.function.map((item: any) => {
        return async (context: any) => {
          const result = await timedRunnerFn(flags.data ?? {data: 'some data to hash'}, item.fn, {
            mode: 'isolated',
            max: item.retries || 3,
            timeout: item.timeout || 2000,
          } as any)

          return context.next({data: result})
        }
      })

      const pipeline = pipes(...fns)
      pipeline.config.timeout = 30000

      const ctx = await pipeline.run(flags.data as any)
      console.log(ctx) // <- eventually store this
      return
    }

    const result = await timedRunnerFn(flags.data ?? {data: 'some data to hash'}, args.function as any, {
      mode: 'isolated',
      retries: 3,
      timeout: 2000,
    })
  }
}
