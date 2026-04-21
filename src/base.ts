import {Command, Flags, Interfaces} from '@oclif/core'

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<(typeof BaseCommand)['baseFlags'] & T['flags']>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

export abstract class BaseCommand<T extends typeof Command> extends Command {
  static enableJsonFlag: boolean = true
  static baseFlags = {
    // general
    force: Flags.boolean({description: 'force the action to complete (not recommended)'}),

    // TODO: map these to Logger levels
    level: Flags.string({
      char: 'l',
      description: 'the level of log to output (must be used with --watch), CSV',
      multiple: true,
      multipleNonGreedy: true,
      default: ['info', 'user', 'status', 'success', 'retry', 'warn', 'error'],
      options: ['info', 'user', 'status', 'success', 'retry', 'warn', 'error'],
    }),

    // TODO: implement this
    silent: Flags.boolean({char: 's'}),
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
