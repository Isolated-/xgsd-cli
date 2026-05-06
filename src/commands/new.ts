import {Args, Command, Flags} from '@oclif/core'
import {readFileSync, rmdirSync, mkdirSync, writeFileSync} from 'fs'
import {pathExistsSync} from 'fs-extra'
import {join} from 'path'
import {input, select} from '@inquirer/prompts'
import Joi from 'joi'
import {prettyBytes, sizeOf} from '../plugins/debug.plugin'

const TEMPLATE_RE = /\{\{([^}]+)\}\}/g
const FULL_TEMPLATE_RE = /^\s*\{\{\s*(.*?)\s*\}\}\s*$/

export function interpolate(template: string, ctx: any) {
  // FULL template: "{{ctx}}"
  const fullMatch = template.match(FULL_TEMPLATE_RE)

  if (fullMatch) {
    const expr = fullMatch[1]

    const value = expr
      .trim()
      .split('.')
      .reduce((acc: any, key: any) => acc?.[key], ctx)

    return value ?? null
  }

  // PARTIAL template: "Hello {{name}}"
  return template.replace(TEMPLATE_RE, (_, expr) => {
    const value = expr
      .trim()
      .split('.')
      .reduce((acc: any, key: any) => acc?.[key], ctx)

    return value == null ? '' : String(value)
  })
}

export default class New extends Command {
  static override args = {
    name: Args.string({
      description: 'name of your project',
      required: true,
    }),
  }
  static override description = 'Create a new xGSD project'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    template: Flags.string({
      options: ['greet'],
      default: 'greet',
    }),

    description: Flags.string({
      char: 'd',
      description: 'description of your project/package',
      default: 'no description',
    }),

    mode: Flags.string({
      char: 'm',
      default: 'async',
      options: ['async', 'chain'],
    }),

    version: Flags.string({
      char: 'v',
      default: '1.0.0',
    }),

    entry: Flags.string({
      char: 'e',
      default: 'index.js',
    }),

    confirm: Flags.boolean({
      char: 'y',
      default: false,
      description: 'skips interactive prompts',
    }),

    // TODO: implement --typescript (for index.ts) and --json (for config.json)
  }

  public async run(): Promise<void> {
    const {flags, args} = await this.parse(New)
    let {template, version, entry, description, mode} = flags
    let name = args.name

    const templatesPath = join(__dirname, '..', '..', 'templates')
    const templatePath = join(templatesPath, template)

    // sanity check
    if (!pathExistsSync(templatePath)) {
      this.error('template path does not exist')
    }

    const destination = join(process.cwd(), name)

    if (pathExistsSync(destination)) {
      this.error(`${destination} already exists - either delete it or choose a new name`)
    }

    if (!flags.confirm) {
      description = await input({message: 'project description?', default: description, required: false})
      version = await input({message: 'project version?', default: version, required: false})
      mode = await select({message: 'project mode?', default: mode, choices: ['async', 'chain']})
      entry = await input({message: 'entry file?', default: entry, required: true})
    }

    mkdirSync(destination)

    const paths = ['package.json', 'index.js', 'config.yaml', 'README.md']

    const ctx = {
      NAME: name,
      DESCRIPTION: description,
      VERSION: version,
      ENTRY: entry,
      MODE: mode,
    }

    const schema = Joi.object({
      NAME: Joi.string()
        .regex(/^[a-zA-Z0-9_-]*$/)
        .required(),
      DESCRIPTION: Joi.string(),
      VERSION: Joi.string(),
      ENTRY: Joi.string(),
      MODE: Joi.string().valid('async', 'chain'),
    })

    const validation = schema.validate(ctx)
    if (validation.error) {
      rmdirSync(destination)

      for (const detail of validation.error.details) {
        this.error(`${detail.message}`)
      }
    }

    function move(source: string, destination: string) {
      if (!pathExistsSync(source)) {
        throw new Error(`${source} does not exist, can't move`)
      }

      const str = readFileSync(source).toString()
      const template = interpolate(str, ctx)

      writeFileSync(destination, template)

      return sizeOf(template)
    }

    for (const path of paths) {
      const dest = join(destination, path)

      const bytes = move(join(templatePath, path), dest)
      this.log(`created ${dest} (${prettyBytes(bytes)})`)
    }
  }
}
