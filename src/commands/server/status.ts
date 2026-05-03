import {Args, Command, Flags} from '@oclif/core'
import {join} from 'path'
import {isBackgroundProcessRunning} from './down'
import {prettyMs} from '../../plugins/debug.plugin'

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

    const {uptime, errors, runs} = await (await fetch(flags.url)).json()

    this.log(`background service running (pid: ${pid})\n${errors} errors/${runs} runs - ${prettyMs(uptime)} uptime`)
  }
}
