import {Args, Command, Flags} from '@oclif/core'
import * as path from 'node:path'
import {BaseCommand} from '../base'
import {
  Context,
  createBlockContext,
  EventBus,
  execute,
  InProcessExecutor,
  processBlock,
  ProcessExecutor,
} from '@xgsd/runtime'
import {prettyMs} from '../plugins/debug.plugin'
import {EventEmitter2} from 'eventemitter2'
import ms = require('ms')

export async function importUserModule<T extends Context = Context>(context: T) {
  try {
    const mod = await import(context.entry)
    return mod
  } catch (e: any) {
    throw new Error(e.message)
  }
}
export default class Call extends BaseCommand<typeof Command> {
  static override args = {
    block: Args.string({description: 'the block/function to test', required: true}),
  }
  static override description = 'describe the command here'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    dev: Flags.boolean(),
    retries: Flags.integer({
      default: 3,
    }),
    timeout: Flags.string({
      default: '1000',
      parse: (input: string): any => {
        return ms(input as ms.StringValue)
      },
    }),
  }

  async runOnce(entryFile: string, block: string, data: any) {
    const mod = await importUserModule({entry: entryFile} as any)

    if (!mod[block]) {
      this.error(`${block} is not defined in your project`)
    }

    if (typeof mod[block] !== 'function') {
      this.error(`${block} is not callable`)
    }

    const b = {
      fn: mod[block],
      run: block,
    }

    const stream = new EventEmitter2({wildcard: true})
    const bus = new EventBus(stream)
    const blockCtx = createBlockContext(b, 0)
    const executor = this.flags.dev ? new InProcessExecutor() : new ProcessExecutor()

    bus.on('system.message', ({payload}) => {
      this.log(payload.message)
    })

    bus.on('block.retrying', ({payload}) => {
      this.log(
        `${payload.block.run} is failing: ${payload.attempt.error.message}. Next retry: ${prettyMs(payload.attempt.nextMs)} (${payload.attempt.attempt + 1}/${payload.attempt.maxRetries})`,
      )
    })

    const output = await executor.run(
      {
        ...blockCtx,
        fn: mod[block],
        options: {
          retries: this.flags.retries,
          timeout: Number(this.flags.timeout),
        },
        input: this.data,
      },
      {
        entry: entryFile,
        bus,
      } as any,
    )

    if (output.output !== undefined && output.output !== null && output.state === 'completed') {
      this.logJson(output.output)
    }

    if (output.error) {
      const err = output.error
      if (err.stack) {
        const [firstLine, ...rest] = err.stack.split('\n')

        const userFrame = rest.find((line: string) => line.includes(entryFile))

        this.log(firstLine)
        if (userFrame) this.log(userFrame)
      } else {
        this.log(err.message ?? String(err))
      }
    }
  }

  public async run(): Promise<void> {
    const entryFile = path.resolve(this.flags.entry)
    const {block} = this.args

    // run once initially
    await this.runOnce(entryFile, block, this.data)
  }
}
