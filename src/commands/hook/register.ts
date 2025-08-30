import {Args, Command, Flags} from '@oclif/core'
import {join} from 'path'

export default class HookRegister extends Command {
  static override args = {
    hook: Args.string({
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
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(HookRegister)

    const hook = args.hook as any
    hook.hook(flags.event ?? 'my-event')
  }
}
