import {Args, Command, Flags} from '@oclif/core'
import {basename, extname, join, resolve} from 'path'
import {mkdtempSync, pathExistsSync, readFileSync, readJsonSync} from 'fs-extra'
import {userCodeOrchestration} from '../@core/pipelines/pipeline.concrete'
import {EventEmitter2} from 'eventemitter2'
import chalk from 'chalk'
import {
  findUserWorkflowConfigPath,
  loadUserWorkflowConfig,
  orchestration,
  validateWorkflowConfig,
} from '../@core/pipelines/pipelines.util'
import {userLogThemes} from '../constants'
import {BaseCommand} from '../base'
import {defaultWith} from '../@core/util/misc.util'
import {normaliseWorkflowName} from '../@core/util/workflow.util'
import {PipelineState} from '../@core/@types/pipeline.types'

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

    concurrency: Flags.integer({
      char: 'c',
      description: 'maximum number of concurrent processes (only for async mode)',
      required: false,
      default: 8,
      max: 32,
      min: 1,
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
      userConfig.options = {...userConfig.options, concurrency: flags.concurrency}
    } catch (error: any) {
      this.error(error.message)
    }

    const data = flags.data as any

    if (!userConfig.enabled) {
      this.log(
        chalk.bold.red(
          `${userConfig.name} is currently disabled - if this is a mistake, re-enable it in the config file by marking \`enabled: true\`.`,
        ),
      )
      this.exit(1)
    }

    const start = performance.now()
    const event = new EventEmitter2({maxListeners: 32, wildcard: true})
    event.on('event', (data) => {
      const end = performance.now()
      if (process.env.DETAIL) {
        console.log(`(event) ${data.payload.step?.name} ${data.event} ${(end - start).toFixed(2)}ms`)
      }
    })

    // this will be moved somewhere else
    const getWorkflowName = (path: string, configName?: string, packageName?: string) => {
      const base = basename(path)
      const configFileName = base.split('.').shift()
      return normaliseWorkflowName(defaultWith('no name', configName, configFileName, packageName)!)
    }

    const workflowName = getWorkflowName(foundPath, userConfig.name, userCodePackageJson.name)
    const newOutputPath = userConfig.logs?.path || join(this.config.home, '.xgsd')

    prettyPrintLogs(event, flags, this)
    try {
      await userCodeOrchestration(
        data,
        {
          ...userConfig,
          name: workflowName,
          version: userConfig.version || userCodePackageJson.version,
          package: userModulePath,
          output: newOutputPath,
          force: flags.force || false,
          cli: this.config.version,
        },
        event,
      )
    } catch (e: any) {
      if (e.message) {
        this.error(e.message)
      } else {
        this.error('An unknown error occurred')
      }
    }
  }
}
