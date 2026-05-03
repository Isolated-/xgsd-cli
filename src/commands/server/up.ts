import {Args, Command, Flags} from '@oclif/core'
import {createApi} from '../../api'
import {BaseCommand} from '../../base'
import chalk from 'chalk'
import {v4} from 'uuid'
import {join, resolve} from 'path'
import {spawn} from 'child_process'
import Joi from 'joi'
import {pathExistsSync, readFileSync, rmSync} from 'fs-extra'
import {isBackgroundProcessRunning} from './down'

export default class Up extends Command {
  static override aliases: string[] = ['start', 'up', 'server:start']
  static override description =
    'starts the background service to enable execution of your project via HTTP (experimental)'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    detached: Flags.boolean({
      char: 'd',
      description: 'runs the API in the background',
      default: false,
    }),

    force: Flags.boolean({
      char: 'f',
      description: 'when process is already running, --force will force start another process',
      default: false,
    }),

    port: Flags.integer({char: 'p', default: 3010, description: 'port for incoming connections'}),
    host: Flags.string({char: 'h', default: 'localhost', description: 'ip/hostname for incoming connections'}),
    auth: Flags.boolean({
      char: 'a',
      default: true,
      allowNo: true,
      description: 'when true, authentication is required (Bearer token) - use --no-auth to override this',
    }),
    token: Flags.string({
      char: 't',
      default: v4(),
      description: '(recommended) leave this empty to generate a random token',
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse()
    const apiKey = flags.auth ? flags.token : undefined

    const path = join(this.config.home, '.local', 'state', 'xgsd')
    const processRunning = pathExistsSync(join(path, 'xgsd.pid'))

    if (processRunning && !flags.force) {
      this.error('Service is already running, use xgsd stop')
    }

    if (flags.force && processRunning) {
      const pid = Number(readFileSync(join(path, 'xgsd.pid')).toString())

      this.log(`killing process ${pid}`)

      try {
        process.kill(pid, 'SIGTERM')
      } catch (error) {}

      this.log('removing old pid file')
      rmSync(join(path, 'xgsd.pid'))
    }

    const pid = isBackgroundProcessRunning(join(path, 'xgsd.pid'))
    if (pid !== false && !flags.force) {
      this.error(`background service already running - use \`xgsd stop\` with \`--pid ${pid}\` (optional)`)
    }

    if (typeof pid === 'number' && !flags.force) {
      rmSync(join(path, 'xgsd.pid'))

      try {
        process.kill(pid)
      } catch (error: any) {
        if (error.code === 'ESRCH') return
        throw error
      }

      this.warn('using this option is not recommended, use `xgsd down` first')
    }

    const usageFlag = flags.usage

    const url = `http://${flags.host}:${flags.port}`

    this.log(`Run: ${chalk.green.bold(url + '/run')}`)
    this.log(`Info: ${chalk.green.bold(url + '/info')}`)

    if (flags.auth) {
      this.log(`Unique token: ${chalk.green.bold(apiKey)} (Bearer)`)
    }

    if (flags.detached) {
      const daemonPath = resolve(__dirname, '..', '..', 'daemon.js')
      const child = spawn('node', [daemonPath], {
        detached: true,
        stdio: ['ignore', 'ignore', 'inherit'],
        env: {
          ...process.env,
          XGSD_API_KEY: apiKey,
          XGSD_PORT: String(flags.port),
          XGSD_HOST: flags.host,
          XGSD_PID_PATH: path,
        },
      })

      this.log(`server is running in the background (pid: ${child.pid})\nuse \`xgsd down\` to exit the server`)

      child.unref()
    } else {
      const api = createApi({
        apiKey,
        pidPath: '',
      })

      await api.listen({port: flags.port, host: flags.host})
    }
  }
}
