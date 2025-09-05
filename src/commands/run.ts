import {Args, Command, Flags} from '@oclif/core'
import {join, resolve} from 'path'
import {mkdtempSync, pathExistsSync, readFileSync, readJsonSync} from 'fs-extra'
import {userCodeOrchestration} from '../@core/pipelines/pipeline.concrete'
import {EventEmitter2} from 'eventemitter2'
import chalk from 'chalk'
import {
  findUserWorkflowConfigPath,
  loadUserWorkflowConfig,
  validateWorkflowConfig,
} from '../@core/pipelines/pipelines.util'
import {userLogThemes} from '../constants'
import {BaseCommand} from '../base'

export const prettyPrintLogs = (event: EventEmitter2, flags: Record<string, any>, cmd: Run) => {
  if (!flags.watch) {
    return
  }

  event.on('message', (msg) => {
    let message = `${msg.log.message}`
    if (!flags.level || !flags.level.includes(msg.log.level)) {
      return
    }

    if ((flags.level && flags.plain) || !userLogThemes[msg.log.level]) {
      cmd.log(`(${msg.log.level}) ${msg.log.message}`)
      return
    }

    message = userLogThemes[msg.log.level](message)
    cmd.log(message)
  })
}

export default class Run extends BaseCommand<typeof Command> {
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
    data: Flags.string({
      char: 'd',
      description: 'data file to use (must be a path)',
      exists: true,
      required: false,
      parse: (input) => {
        return readJsonSync(input)
      },
    }),
  }

  public async run(): Promise<any> {
    const flags = this.flags!
    const args = this.args!

    const path = resolve(args.function)
    const userModulePath = path

    // this will eventually be refactored
    const packageJsonPath = join(path, 'package.json')
    if (!pathExistsSync(packageJsonPath)) {
      this.error(`package.json not found at ${packageJsonPath}, you'll need an NPM package before continuing.`)
    }

    const userCodePackageJson = readJsonSync(packageJsonPath)
    const foundPath = findUserWorkflowConfigPath(userModulePath, flags.workflow)
    if (!foundPath) {
      this.error(
        `unable to find a configuration file at ${userModulePath}, please create a new "config.yaml" in your package folder.`,
      )
    }

    let userConfig
    try {
      userConfig = validateWorkflowConfig(loadUserWorkflowConfig(userModulePath, flags.workflow!))
    } catch (error: any) {
      this.error(error.message)
    }

    userConfig.name = userConfig.name || userCodePackageJson.name || 'not specified'

    const data = flags.data as any

    if (!userConfig.enabled) {
      this.log(
        chalk.bold.red(
          `${userConfig.name} is currently disabled - if this is a mistake, re-enable it in the config file by marking \`enabled: true\`.`,
        ),
      )
      this.exit(1)
    }

    const event = new EventEmitter2()
    const name = userConfig.name
    const writePath = join(path, 'runs', name!)

    prettyPrintLogs(event, flags, this)
    return userCodeOrchestration(
      data,
      {
        ...userConfig,
        version: userConfig.version || userCodePackageJson.version,
        package: userModulePath,
        output: writePath,
      },
      event,
    )
  }
}
