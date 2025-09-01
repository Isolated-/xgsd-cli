import {Args, Command, Flags} from '@oclif/core'
import {dirname, join} from 'path'
import {retry, runner, runnerFn, timedRunnerFn, execute as xgsdv1} from '../@core/@shared/runner'
import {getDefaultPipelineConfig, orchestration} from '../@core/pipelines/pipelines.util'
import {
  createWriteStream,
  ensureDirSync,
  ensureFileSync,
  pathExistsSync,
  readFileSync,
  readJsonSync,
  writeFileSync,
  writeJsonSync,
} from 'fs-extra'
import {Pipeline, userCodeOrchestration} from '../@core/pipelines/pipeline.concrete'
import * as Joi from 'joi'
import {PipelineMode} from '../@core/@types/pipeline.types'
import {load} from 'js-yaml'
import {testActionFn} from '../@core/actions/test.action'
import {EventEmitter2} from 'eventemitter2'
import {WriteStream} from 'fs'
import chalk from 'chalk'

export default class Run extends Command {
  static override args = {
    function: Args.string({
      description: 'function to run',
      required: true,
    }),
  }
  static override enableJsonFlag: boolean = true
  static override description = 'describe the command here'
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
  }

  public async run(): Promise<any> {
    const {args, flags} = await this.parse(Run)

    if (typeof args.function === 'function') {
      const result = await timedRunnerFn(flags.data ?? {data: 'some data'}, args.function, {
        mode: flags.local ? 'local' : 'isolated',
        retries: 3,
        timeout: 3000,
      })

      return result
    }

    const modulePath = join(process.cwd(), args.function)

    // this will eventually be refactored
    const packageJsonPath = join(process.cwd(), args.function, 'package.json')
    if (!pathExistsSync(packageJsonPath)) {
      this.error(
        `package.json not found at ${packageJsonPath}, did you run yarn? Alternatively, use $ xgsd create {action} and we'll do it for you!`,
      )
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

    const configFilePath = join(process.cwd(), args.function, 'config.yml')

    if (!pathExistsSync(configFilePath)) {
      this.error(`config.yml not found at ${configFilePath}, either create it or use --pipeline`)
    }

    const configFileYml = readFileSync(configFilePath).toString()
    const configFileJson = load(configFileYml) as Record<string, unknown>

    const validationSchema = Joi.object({
      name: Joi.string().default(userCodePackageJson.name),
      description: Joi.string().optional(),
      runner: Joi.string().valid('xgsd@v1').default('xgsd@v1'),
      metadata: Joi.object().optional(),
      mode: Joi.string().valid('chained', 'fanout', 'async').default('chained') as Joi.Schema<PipelineMode>,
      config: Joi.object().optional(),
      options: Joi.object({
        timeout: Joi.number().default(60000),
        maxRetries: Joi.number().default(5),
      }).optional(),
      collect: Joi.object({
        logs: Joi.boolean().default(flags.logs || false),
        run: Joi.boolean().default(flags.save || false),
      }).optional(),
      steps: Joi.array()
        .items(
          Joi.object({
            name: Joi.string().required(),
            description: Joi.string().optional(),
            action: Joi.string().required(),
            config: Joi.object().optional(),
          }),
        )
        .optional(),
    })

    // this shouldn't deal with validation,
    // just hand it to the runner

    // internal pipeline test
    const data = (flags.data as any) ?? {data: 'some data'}

    const {error, value: userConfig} = validationSchema.validate(configFileJson, {
      allowUnknown: true,
      stripUnknown: true,
    })

    const event = new EventEmitter2()

    const name = userConfig.name
    const date = new Date().toISOString().replace(/:/g, '-')
    const writePath = join(process.cwd(), args.function, 'runs', name.toLowerCase().replace(/\s+/g, '-'))

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
          this.log(message)
        }
      })
    }

    // pipeline + steps should emit progress events,
    // for update progress spinners etc
    event.on('progress', (context) => {})

    const wrapped = await userCodeOrchestration(
      data,
      {...userConfig, version: userCodePackageJson.version, package: modulePath, output: writePath},
      event,
    )

    return {}
  }

  async orchestrate(): Promise<string> {
    const event = new EventEmitter2()
    let runId = ''

    event.on('start', (id) => {
      runId = id
      this.log(`Pipeline started: ${id}`)
    })

    event.on('message', (msg) => {
      // save to file
    })

    return runId
  }
}

export async function orchestrate() {
  const event = new EventEmitter2()
  let runId = ''
}
