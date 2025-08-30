import {Args, Command, Flags} from '@oclif/core'
import {join} from 'path'
import {testActionFn} from '../@core/actions/test.action'
import {runnerFn, timedRunnerFn} from '../@core/@shared/runner'
import {RunFn} from '../@core/@shared/types/runnable.types'
import {pipes} from '../@core/pipelines/pipelines.util'

export default class Run extends Command {
  static override args = {
    action: Args.string({
      name: 'CLI action to run',
      options: ['generate-key'],
      required: true,
    }),
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
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Run)

    const action = args.action as any

    const pipeFn = async (context: any) => {
      const result = await timedRunnerFn(
        {data: 'payload'},
        args.function as any,
        {mode: 'isolated', max: 3, timeout: 2000} as any,
      )

      return context.next({data: result})
    }

    const pipeline = pipes(pipeFn)
    await pipeline.run()
  }
}
