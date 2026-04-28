import {Args, Command, Flags} from '@oclif/core'
import {join, resolve} from 'path'
import {BaseCommand} from '../base'
import {EventEmitter2} from 'eventemitter2'
import {bootstrap, ConfigParser, createContext, EventBus, RuntimePreset, RuntimePresetFunction} from '@xgsd/runtime'
import {debugPreset} from '../presets/debug.preset'
import {defaultPreset} from '../presets/default.preset'
import {developmentPreset} from '../presets/development.preset'
import {v7} from 'uuid'
import Joi = require('joi')
import {pathExistsSync, readFileSync, readJsonSync} from 'fs-extra'
import {load} from 'js-yaml'
import * as path from 'path'
import ms = require('ms')

function resolvePackageJson(input: string): string {
  try {
    return require.resolve(`${input}/package.json`, {
      paths: [process.cwd()],
    })
  } catch {
    try {
      const entry = require.resolve(input, {
        paths: [process.cwd()],
      })

      let dir = path.dirname(entry)

      while (dir !== path.dirname(dir)) {
        const candidate = path.join(dir, 'package.json')
        if (pathExistsSync(candidate)) return candidate
        dir = path.dirname(dir)
      }

      throw new Error(`package.json not found for ${input}`)
    } catch (err: any) {
      throw new Error(`Cannot resolve package.json for "${input}"`)
    }
  }
}

// this will live in sdk
function composePreset(opts: any, ...presets: RuntimePresetFunction[]): RuntimePreset {
  const compiled: RuntimePreset[] = presets.map((p) => p(opts))

  return {
    loggers: compiled.flatMap((p) => p.loggers ?? []),
    plugins: compiled.flatMap((p) => p.plugins ?? []),
    executor: compiled.reverse().find((p) => p.executor)?.executor,
    orchestrator: compiled.reverse().find((p) => p.orchestrator)?.orchestrator,
  }
}

export default class Run extends BaseCommand<typeof Command> {
  static override args = {
    function: Args.string({
      description: 'function to run',
      default: '.',
    }),
  }
  static override enableJsonFlag: boolean = true
  static override description = ''
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    debug: Flags.boolean({
      char: 'd',
      description: 'verbose debug information is printed when this option is used.',
      aliases: ['verbose'],
    }),
    local: Flags.boolean({
      description: '--lite has been replaced by this option. Uses no process isolation for faster runs',
      char: 'l',
      aliases: ['dev', 'development', 'local', 'fast'],
    }),
    config: Flags.string({
      char: 'c',
      description: 'path to your configuration file (defaults to config.yaml inside your project directory)',
    }),
    save: Flags.boolean({
      char: 's',
      allowNo: true,
      default: true,
    }),
    logs: Flags.boolean({
      char: 'L',
      allowNo: true,
      default: true,
    }),
    // TODO: provide data here again but make it explictly override config.yaml data vs merging with it
    // support data not from a file
    data: Flags.string({
      char: 'i',
      description: 'overrides config data (completely), path to your data (must be in JSON or yaml format)',
      parse: (path: string) => {
        const p = resolve(path)

        let data = undefined
        try {
          data = readJsonSync(p)
          return data
        } catch (error) {}

        const raw = readFileSync(p).toString()
        const yaml = load(raw)

        return yaml
      },
    }),
  }

  public async run(): Promise<any> {
    const flags = this.flags!
    const args = this.args!
    const packagePath = resolve(args.function)
    const configPath = flags.config ?? join(packagePath, 'config.yaml')

    try {
      const presets: any[] = [defaultPreset]
      if (flags.debug) {
        presets.push(debugPreset)
      }

      if (flags.local) {
        presets.push(developmentPreset)
      }

      const options = Joi.object({
        backoff: Joi.string().valid('linear', 'exponential', 'squaring').default('exponential'),
        retries: Joi.number().greater(0).default(3),
        timeout: Joi.alt(Joi.number().greater(0), Joi.string()).default(5000),
      }).default({
        backoff: 'exponential',
        retries: 3,
        timeout: 5000,
      })

      const block = Joi.object({
        run: Joi.string().required(),
        name: Joi.string(),
        input: Joi.object(),
        env: Joi.object(),
        options,
      })

      const stream = new EventEmitter2({wildcard: true})
      const schema = Joi.object({
        name: Joi.string().default('unknown'),
        description: Joi.string().default('no description'),
        version: Joi.alt(Joi.string(), Joi.number()),
        mode: Joi.string().valid('async', 'chain').default('async'),
        metadata: Joi.object().default({}),
        options,
        data: Joi.object(),
        concurrency: Joi.number().greater(0).less(32).default(4),
        blocks: Joi.array().items(block).default([]),
      })

      const config = new ConfigParser(configPath)
        .load()
        .parse()
        .validate((input) => {
          const {value, error} = schema.validate(input)

          if (error) {
            throw new Error(error.message)
          }

          const blocks = value.blocks.map((b: any) => {
            const {options, ...block} = b
            const opts = options

            if (opts.timeout && typeof opts.timeout === 'string') {
              opts.timeout = ms(opts.timeout as ms.StringValue)
            }

            return {
              ...block,
              options: opts,
            }
          })

          return {
            ...value,
            blocks,
          }
        })
        .build() as {project: any; blocks: any[]} // <- fix this up

      const bus = new EventBus(stream)

      // resolve the entry point from package json
      const pkg = resolvePackageJson(packagePath)
      const context = readJsonSync(pkg)

      if (!context.main) {
        throw new Error('no entry point found in package.json')
      }

      // TODO: move this back into @xgsd/runtime
      const ctx = createContext(packagePath)
        .entry(join(packagePath, context.main))
        .config(config)
        .bus(bus)
        .id(v7)
        .name()
        .version()
        .data(flags.data ?? config.project.data)
        .mode()
        .env()
        .concurrency(config.project.concurrency)
        .blocks()
        .blockCount()
        .build()

      // new way
      await bootstrap({
        ctx,
        stream,
        summary: {},
        preset: composePreset(
          {
            createReport: flags.save,
            levels: !flags.logs ? [] : ['info', 'user', 'warn', 'error'],
            logs: flags.logs,
          },
          ...presets,
        ),
      })
    } catch (e: any) {
      if (e.message) {
        this.error(e.message)
      } else {
        this.error('An unknown error occurred')
      }
    }
  }
}
