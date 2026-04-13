import {Args, Command, Flags} from '@oclif/core'
import {cpSync, mkdir, mkdirSync, pathExistsSync, readJsonSync, writeFileSync, writeJsonSync} from 'fs-extra'
import {resolve, join} from 'path'
import {
  findUserProjectConfigPath,
  loadUserProjectConfig,
  saveUserProjectConfig,
} from '../@core/pipelines/pipelines.util'

export default class New extends Command {
  static override args = {
    project: Args.string({description: 'project name (must be provided)', required: true}),
  }

  static override description = 'describe the command here'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    // flag with no value (-f, --force)
    force: Flags.boolean({char: 'f'}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(New)

    // create project folder (relative for now)
    if (!pathExistsSync(args.project!)) {
      mkdirSync(args.project!)
    }

    cpSync(join(process.cwd(), 'templates', 'bundled'), args.project!, {recursive: true})

    let config = loadUserProjectConfig(args.project!)

    config.name = args.project!

    saveUserProjectConfig(args.project!, config)
  }
}
