import {Args, Command, Flags} from '@oclif/core'
import {join, resolve} from 'path'
import {BaseCommand} from '../base'
import {EventEmitter2} from 'eventemitter2'
import {bootstrap, ConfigParser, createContext, EventBus, RuntimePreset, RuntimePresetFunction} from '@xgsd/runtime'
import {debugPreset} from '../presets/debug.preset'
import {defaultPreset} from '../presets/default.preset'
import {developmentPreset} from '../presets/development.preset'
import ora from 'ora'
import {v4, v7} from 'uuid'
import Joi = require('joi')
import {pathExistsSync, readFileSync, readJsonSync} from 'fs-extra'
import {load} from 'js-yaml'
import * as path from 'path'

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
function composePreset(...presets: RuntimePresetFunction[]): RuntimePreset {
  const compiled: RuntimePreset[] = presets.map((p) => p())

  return {
    loggers: compiled.flatMap((p) => p.loggers ?? []),
    plugins: compiled.flatMap((p) => p.plugins ?? []),
    executor: compiled.reverse().find((p) => p.executor)?.executor,
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
      char: 'D',
      description: 'verbose debug information is printed when this option is used.',
      aliases: ['verbose'],
    }),
    development: Flags.boolean({
      description: '--lite has been replaced by this option. Uses no process isolation for faster runs',
      char: 'd',
      aliases: ['dev', 'local'],
    }),
    config: Flags.string({
      char: 'c',
      description: 'path to your configuration file (defaults to config.yaml inside your project directory)',
    }),
    // TODO: provide data here again but make it explictly override config.yaml data vs merging with it
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

      if (flags.development) {
        presets.push(developmentPreset)
      }

      let spinner
      if (!flags.silent) {
        spinner = ora('running your project').start()
      }

      const stream = new EventEmitter2({wildcard: true})
      const schema = Joi.object()
      const config = new ConfigParser(configPath)
        .load()
        .parse()
        .default({
          mode: 'async',
          concurrency: 4,
          blocks: [],
        })
        .validate((input) => schema.validate(input).value)
        .build() as {project: any; blocks: any[]} // <- fix this up

      const bus = new EventBus(stream)

      // resolve the entry point from package json
      const pkg = resolvePackageJson(packagePath)
      const context = readJsonSync(pkg)

      if (!context.main) {
        throw new Error('no entry point found in package.json')
      }

      const entry = join(packagePath, context.main)

      const ctx = createContext(packagePath)
        .entry(entry)
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
        preset: composePreset(...presets),
      })

      spinner?.stop()
    } catch (e: any) {
      if (e.message) {
        this.error(e.message)
      } else {
        this.error('An unknown error occurred')
      }
    }
  }
}
