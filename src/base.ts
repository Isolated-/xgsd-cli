import {Command, Flags, Interfaces} from '@oclif/core'
import {appendFileSync, ensureDirSync, pathExistsSync, readFileSync, readJsonSync, writeFileSync} from 'fs-extra'
import {load} from 'js-yaml'
import {join, resolve} from 'path'
import {v7} from 'uuid'

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<(typeof BaseCommand)['baseFlags'] & T['flags']>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

export function getInstallation(path: string): string | null {
  if (!pathExistsSync(path)) {
    return null
  }

  return readFileSync(path).toString()
}

function loadDataFromFile(path: string): Record<string, unknown> {
  const absolute = resolve(path)

  let data = undefined
  try {
    data = readJsonSync(absolute)
  } catch (error) {}

  const raw = readFileSync(absolute).toString()
  const yaml = load(raw)

  return yaml as Record<string, unknown>
}

export abstract class BaseCommand<T extends typeof Command> extends Command {
  static enableJsonFlag: boolean = true
  static baseFlags = {
    data: Flags.string({
      char: 'd',
      parse: async (input: string) => {
        try {
          // parse as JSON
          return JSON.parse(input)
        } catch (error) {
          // parse as JSON/yaml file
          if (pathExistsSync(input)) {
            return loadDataFromFile(input)
          }

          throw new Error('cannot parse data')
        }
      },
    }),

    metrics: Flags.boolean({
      description: 'sends anonymous metrics to xGSD (everything sent logs to {project}/exports/exports.jsonl).',
      default: true,
      allowNo: true,
    }),

    entry: Flags.string({char: 'e', default: 'index.js', description: 'the entry point to your project'}),
  }

  protected flags!: Flags<T>
  protected args!: Args<T>
  protected data!: Record<string, unknown>

  public async init(): Promise<void> {
    await super.init()
    const {args, flags} = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      args: this.ctor.args,
      strict: this.ctor.strict,
    })

    this.flags = flags as Flags<T>
    this.args = args as Args<T>

    let data: Record<string, unknown> = this.flags.data as any
    // stdin support
    if (data === undefined && !process.stdin.isTTY) {
      const stdin = await new Promise<string>((resolve) => {
        let buf = ''
        process.stdin.on('data', (chunk) => (buf += chunk))
        process.stdin.on('end', () => resolve(buf))
      })

      data = JSON.parse(stdin)
    }

    this.data = data
  }
}
