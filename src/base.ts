import {Command, Flags, Interfaces} from '@oclif/core'

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<(typeof BaseCommand)['baseFlags'] & T['flags']>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

export abstract class BaseCommand<T extends typeof Command> extends Command {
  static enableJsonFlag: boolean = true
  static baseFlags = {
    // general
    force: Flags.boolean({description: 'force the action to complete (not recommended)'}),
    watch: Flags.boolean({
      char: 'w',
      description:
        'watch for changes (streams logs to console from containers/processes/etc), wont impact logs written to disk',
    }),

    level: Flags.string({
      char: 'l',
      description: 'the level of log to output (must be used with --watch), CSV',
      multiple: true,
      multipleNonGreedy: true,
      default: ['info', 'user', 'status', 'success', 'retry', 'warn', 'error'],
      options: ['info', 'user', 'status', 'success', 'retry', 'warn', 'error'],
    }),

    // workflow/orchestration
    workflow: Flags.string({
      char: 'e',
      description: 'you can specify a workflow by name when you have a workflows/ folder in your NPM package',
      required: false,
    }),

    // UI/output
    plain: Flags.boolean({char: 'p', description: 'run in plain mode (no colours)'}),
  }

  protected flags!: Flags<T>
  protected args!: Args<T>

  public async init(): Promise<void> {
    await super.init()
    const {args, flags} = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      args: this.ctor.args,
      strict: this.ctor.strict,
    })

    this.flags = flags as Flags<T>
    this.args = args as Args<T>
  }
}
