import {Args, Command, Flags} from '@oclif/core'
import {join} from 'path'
import {pathExistsSync, readFileSync, readJsonSync} from 'fs-extra'
import {Pipeline, userCodeOrchestration} from '../@core/pipelines/pipeline.concrete'
import * as Joi from 'joi'
import {PipelineMode} from '../@core/@types/pipeline.types'
import {load} from 'js-yaml'
import {EventEmitter2} from 'eventemitter2'
import chalk from 'chalk'

export default class Run extends Command {
  static override args = {
    function: Args.string({
      description: 'function to run',
      required: true,
    }),
  }
  static override enableJsonFlag: boolean = true
  static override description =
    "Run pipelines that you've created with error handling, retries, timeouts, isolation, and more."
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

    plain: Flags.boolean({char: 'p', description: 'run in plain mode (no colours)'}),
  }

  public async run(): Promise<any> {
    const {args, flags} = await this.parse(Run)

    const modulePath = join(process.cwd(), args.function)

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

    let configFilePath = join(process.cwd(), args.function, 'config.yml')
    if (!pathExistsSync(configFilePath)) {
      configFilePath = join(process.cwd(), args.function, 'config.yaml')
    }

    if (!pathExistsSync(configFilePath)) {
      this.error(`config.yml not found at ${configFilePath}, either create it or use --pipeline`)
    }

    const configFileYml = readFileSync(configFilePath).toString()
    const configFileJson = load(configFileYml) as Record<string, unknown>

    const max = 30 * 24 * 60 * 60 * 1000
    const retryValidator = Joi.number().min(0).max(max).default(5)
    const timeoutValidator = Joi.string()
      .pattern(/^\d+ms$/)
      .default('5000ms')
    const optionsValidator = Joi.object({
      timeout: timeoutValidator,
      maxRetries: retryValidator,
      retries: retryValidator,
    }).optional()

    const validationSchema = Joi.object({
      name: Joi.string().default(userCodePackageJson.name),
      description: Joi.string().optional(),
      enabled: Joi.boolean().default(true),
      runner: Joi.string().valid('xgsd@v1').default('xgsd@v1'),
      metadata: Joi.object().optional(),
      mode: Joi.string().valid('chained', 'fanout', 'async').default('chained') as Joi.Schema<PipelineMode>,
      config: Joi.object().optional(),
      options: optionsValidator.default({
        timeout: 5000,
        maxRetries: 5,
        retries: 5,
      }),
      collect: Joi.object({
        logs: Joi.boolean().default(flags.logs || false),
        run: Joi.boolean().default(flags.save || false),
      }).optional(),
      steps: Joi.array()
        .items(
          Joi.object({
            enabled: Joi.boolean().default(true),
            name: Joi.string().required(),
            description: Joi.string().optional(),
            action: Joi.string().required(),
            options: optionsValidator,
          }),
        )
        .optional(),
    })

    const data = (flags.data as any) ?? {data: 'some data'}
    const {error, value: userConfig} = validationSchema.validate(configFileJson, {
      allowUnknown: true,
      stripUnknown: true,
    })

    if (!userConfig.enabled) {
      this.log(
        `${userConfig.name} is currently disabled - if this is a mistake, re-enable it in the config file by marking \`enabled: true\`.`,
      )
      this.log(`path to config file: ${configFilePath}`)
      this.exit(10)
    }

    const event = new EventEmitter2()
    const name = userConfig.name
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
          this.log(flags.plain ? `(${msg.log.level}) ${msg.log.message}` : message)
        }
      })
    }

    await userCodeOrchestration(
      data,
      {...userConfig, version: userCodePackageJson.version, package: modulePath, output: writePath},
      event,
    )

    return {}
  }
}
