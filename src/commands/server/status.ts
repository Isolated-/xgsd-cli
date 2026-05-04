import {Args, Command, Flags} from '@oclif/core'
import {join} from 'path'
import {isBackgroundProcessRunning} from './down'
import {prettyMs, prettyBytes} from '../../plugins/debug.plugin'
import chalk from 'chalk'

export default class Status extends Command {
  static override args = {}
  static override description = 'query server/process status (up/down + run count + uptime)'
  static override aliases: string[] = ['status', 'server:status']
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    url: Flags.string({
      char: 'u',
      description: 'full url to /info endpoint',
      default: 'http://localhost:3010/info',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse()
    const path = join(this.config.home, '.local', 'state', 'xgsd', 'xgsd.pid')

    const pid = isBackgroundProcessRunning(path)
    if (pid === false) {
      this.log('background service is not running use `xgsd up`')
      return
    }

    const {uptime, errors, runs, memory_usage_heap_used} = await (await fetch(flags.url)).json()

    const info = chalk.bold.blue
    const error = chalk.bold.red

    this.log(`background service is running (pid: ${info(pid)})`)

    this.log()
    this.log(`memory usage: ${info(prettyBytes(memory_usage_heap_used))}`)
    this.log(`uptime: ${info(prettyMs(uptime))}`)

    this.log()
    this.log(`${error(errors)} errors/${info(runs)} runs`)
  }
}
