import {Args, Command, Flags} from '@oclif/core'
import {join} from 'path'
import {mkdtempSync, pathExistsSync, readFileSync, readJsonSync} from 'fs-extra'
import {userCodeOrchestration} from '../@core/pipelines/pipeline.concrete'
import * as Joi from 'joi'
import {load} from 'js-yaml'
import {EventEmitter2} from 'eventemitter2'
import chalk from 'chalk'
import {
  findUserWorkflowConfigPath,
  loadUserWorkflowConfig,
  validateWorkflowConfig,
} from '../@core/pipelines/pipelines.util'

export default class Run extends Command {
  static override args = {
    function: Args.string({
      description: 'function to run',
      required: true,
    }),
  }
  static override enableJsonFlag: boolean = true
  static override description =
    'Run workflows and your code with full confidence. Error handling, retries, timeouts, and isolation - all built in.'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    // flag with no value (-f, --force)
    force: Flags.boolean({char: 'f'}),
    // flag with a value (-n, --name=VALUE)
    name: Flags.string({char: 'n', description: 'name to print'}),
    data: Flags.string({
      char: 'd',
      description: 'data file to use (must be a path)',
      exists: true,
      required: false,
      parse: (input) => {
        return readJsonSync(input)
      },
    }),

    watch: Flags.boolean({char: 'w', description: 'watch for changes (streams logs to console)'}),
    'log-level': Flags.string({
      char: 'l',
      description: 'log level',
      aliases: ['level', 'logs', 'logLevel'],
      options: ['info', 'status', 'warn', 'error', 'success'],
      multiple: true,
      default: ['info', 'status', 'warn', 'error', 'success'],
    }),

    workflow: Flags.string({
      char: 'e',
      description: 'you can specify a workflow by name when you have a workflows/ folder in our NPM package',
      required: false,
    }),

    plain: Flags.boolean({char: 'p', description: 'run in plain mode (no colours)'}),
  }

  public async run(): Promise<any> {
    const {args, flags} = await this.parse(Run)

    const userModulePath = join(process.cwd(), args.function)

    // this will eventually be refactored
    const packageJsonPath = join(process.cwd(), args.function, 'package.json')
    if (!pathExistsSync(packageJsonPath)) {
      this.error(`package.json not found at ${packageJsonPath}, you'll need an NPM package before continuing.`)
    }

    const userCodePackageJson = readJsonSync(packageJsonPath)
    this.log(
      `found your package, info: ${userCodePackageJson.name}@${userCodePackageJson.version} - ${
        userCodePackageJson.description || 'no description'
      }`,
    )

    if (userCodePackageJson.main === undefined) {
      this.error(`package.json at ${packageJsonPath} is missing a "main" entry`)
    }

    const main = userCodePackageJson.main
    this.log(`found your main entry point: ${main}, this will be loaded shortly.`)

    const foundPath = findUserWorkflowConfigPath(userModulePath)
    if (!foundPath) {
      this.error(
        `unable to find a configuration file at ${userModulePath}, please create a new "config.yaml" in your package folder.`,
      )
    }

    this.log(`found your configuration file at ${foundPath}`)

    let userConfig
    try {
      userConfig = validateWorkflowConfig(loadUserWorkflowConfig(userModulePath, flags.workflow!))
    } catch (error: any) {
      this.error(error.message)
    }

    const data = (flags.data as any) ?? {data: 'some data'}

    if (!userConfig.enabled) {
      this.log(
        `${userConfig.name} is currently disabled - if this is a mistake, re-enable it in the config file by marking \`enabled: true\`.`,
      )
      this.log(`path to config file: ${foundPath}`)
      this.exit(10)
    }

    const event = new EventEmitter2()
    const name = userConfig.name
    const writePath = join(process.cwd(), args.function, 'runs', name!.toLowerCase().replace(/\s+/g, '-'))

    if (flags.watch) {
      event.on('message', (msg) => {
        let message = `${msg.log.message}`
        if (!flags['log-level'].includes(msg.log.level)) {
          return
        }

        if (msg.log.level === 'error' || msg.log.level === 'fail' || msg.log.level === 'retry') {
          message = chalk.red(message)
        }

        if (msg.log.level === 'warn') {
          message = chalk.yellow(message)
        }

        if (msg.log.level === 'success') {
          message = chalk.green(message)
        }

        if (msg.log.level === 'info' || msg.log.level === 'log' || msg.log.level === 'status') {
          message = chalk.blue(message)
        }

        if (flags['log-level'].includes(msg.log.level)) {
          this.log(flags.plain ? `(${msg.log.level}) ${msg.log.message}` : message)
        }
      })
    }

    await userCodeOrchestration(
      data,
      {...userConfig, version: userCodePackageJson.version, package: userModulePath, output: writePath},
      event,
    )

    return {}
  }
}
