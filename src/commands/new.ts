import {Args, Command, Flags} from '@oclif/core'
import {readFileSync, rmdirSync, mkdirSync, writeFileSync, readdirSync, cpSync, rmSync, statSync} from 'fs'
import {ensureFileSync, pathExistsSync} from 'fs-extra'
import {join, resolve} from 'path'
import {input, select, confirm} from '@inquirer/prompts'
import Joi from 'joi'
import {prettyBytes, sizeOf} from '../plugins/debug.plugin'

export const TEMPLATE_RE = /\{\{([^}]+)\}\}/g
export const FULL_TEMPLATE_RE = /^\s*\{\{\s*(.*?)\s*\}\}\s*$/

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
      default: 'greet',
      description: 'blank/greet for built-ins or provide a path to a template project',
    }),

    recursive: Flags.boolean({
      default: false,
      char: 'r',
      description: 'enable recursive mode (ignores node_modules)',
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

    const builtInTemplatesPath = join(__dirname, '..', '..', 'templates')

    const builtins = readdirSync(builtInTemplatesPath).filter((s) => s !== 'README.md')

    let templatePath = ''

    // if its in templates/
    if (builtins.includes(template)) {
      templatePath = join(builtInTemplatesPath, template)
    } else {
      // otherwise fall back to template = path
      templatePath = resolve(template)
    }

    // sanity check
    if (!pathExistsSync(templatePath)) {
      this.error(`${templatePath} does not exist`)
    }

    const destination = join(process.cwd(), name)

    function cleanup() {
      if (pathExistsSync(destination)) rmdirSync(destination)
    }

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

    const paths = readdirSync(templatePath, {recursive: flags.recursive})

    const validation = schema.validate(ctx)
    if (validation.error) {
      cleanup()

      for (const detail of validation.error.details) {
        this.error(`${detail.message}`)
      }
    }

    function move(source: string, destination: string) {
      ensureFileSync(destination)

      const str = readFileSync(source).toString()
      const template = interpolate(str, ctx)

      writeFileSync(destination, template)

      return sizeOf(template)
    }

    if (paths.length > 100) {
      this.warn(`trying to copy ${paths.length} files to ${destination}. Are you sure this is a template?`)

      if (!flags.confirm) {
        const conf = await confirm({message: 'continue?', default: false})
        if (!conf) {
          cleanup()

          return
        }
      }
    }

    for (const path of paths as string[]) {
      const dest = join(destination, path)
      const abs = join(templatePath, path)

      if (abs.includes('node_modules')) {
        continue
      }

      const stat = statSync(abs)
      if (stat.isDirectory()) {
        continue
      }

      const bytes = move(join(templatePath, path), dest)

      this.log(`created ${dest} (${prettyBytes(bytes)})`)
    }
  }
}
