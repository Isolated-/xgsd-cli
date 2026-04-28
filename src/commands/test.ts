import {Args, Command, Flags} from '@oclif/core'
import * as path from 'node:path'
import {BaseCommand} from '../base'
import {Context, execute} from '@xgsd/runtime'
import {prettyMs} from '../plugins/debug.plugin'

export async function importUserModule<T extends Context = Context>(context: T) {
  try {
    const mod = await import(context.entry)
    return mod
  } catch (e: any) {
    throw new Error(e.message)
  }
}
export default class Test extends BaseCommand<typeof Command> {
  static override args = {
    block: Args.string({description: 'the block/function to test', required: true}),
  }
  static override description = 'describe the command here'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {}

  async runOnce(entryFile: string, block: string, data: any) {
    const mod = await importUserModule({entry: entryFile} as any)

    if (!mod[block]) {
      this.error(`${block} is not defined in your project`)
    }

    if (typeof mod[block] !== 'function') {
      this.error(`${block} is not callable`)
    }

    this.log(`BLOCK: ${block}`)
    if (data !== undefined) {
      this.log(`INPUT`)
      this.logJson(data)
    }

    const start = performance.now()
    const result = await execute(mod[block], data, {timeout: 1000})
    const duration = performance.now() - start

    this.log()
    this.log(`TIME: ${prettyMs(duration)}`)

    if (result.data !== undefined && result.data !== null) {
      this.log()
      this.log('OUTPUT')
      this.logJson(result.data)
    }

    if (result.error) {
      this.log()
      this.log('ERROR')

      const err = result.error
      if (err.stack) {
        const [firstLine, ...rest] = err.stack.split('\n')

        const userFrame = rest.find((line) => line.includes(entryFile))

        this.log(firstLine)
        if (userFrame) this.log(userFrame)
      } else {
        this.log(err.message ?? String(err))
      }
    }

    if ((result.data === undefined || result.data === null) && !result.error) {
      this.log(`OUTPUT: ${block} completed successfully but has no output data`)
    }
  }

  public async run(): Promise<void> {
    const entryFile = path.resolve(this.flags.entry)
    const {block} = this.args

    // run once initially
    await this.runOnce(entryFile, block, this.data)
  }
}
