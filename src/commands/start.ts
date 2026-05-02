import {Args, Command, Flags} from '@oclif/core'
import {createApi} from '../api'
import {BaseCommand} from '../base'
import chalk from 'chalk'
import {v4} from 'uuid'

export default class Start extends BaseCommand<typeof Start> {
  static override args = {
    file: Args.string({description: 'file to read'}),
  }
  static override description = 'Run your project via HTTP (experimental)'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    path: Flags.string({
      char: 'p',
      description: 'path to your project (will override config path + entry)',
      aliases: ['project', 'projectPath'],
      default: process.cwd(),
      required: true,
    }),

    config: Flags.string({
      char: 'c',
      description: 'path to your configuration file (defaults to config.yaml)',
      default: 'config.yaml',
      required: true,
    }),

    port: Flags.integer({default: 3010, description: 'port to bind server to'}),
    host: Flags.string({default: 'localhost', description: 'host to bind server to'}),
    auth: Flags.boolean({default: true, allowNo: true, description: 'accepts requests without authentication'}),
    token: Flags.string({default: v4(), description: '(note) leave this empty to generate a random token'}),
  }

  public async run(): Promise<void> {
    const apiKey = this.flags.auth ? this.flags.token : undefined
    const api = createApi({
      projectPath: this.flags.path,
      configName: this.flags.config,
      usageFlag: this.flags.usage,
      apiKey,
    })

    this.log(chalk.bold(`EXPERIMENTAL FEATURE`))
    this.log(chalk.bold(`Use --usage or set usage.enabled = true in your project config to improve this command`))
    this.log()

    const url = `http://${this.flags.host}:${this.flags.port}`

    this.log(`Run: ${chalk.green.bold(url + '/run')}`)
    this.log(`Info: ${chalk.green.bold(url + '/info')}`)

    if (this.flags.auth) {
      this.log(`Unique token: ${chalk.green.bold(apiKey)} (Bearer)`)
    }

    await api.listen({port: this.flags.port, host: this.flags.host})
  }
}
