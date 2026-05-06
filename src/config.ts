import {pathExistsSync, readJsonSync} from 'fs-extra'
import {join} from 'path'
export const XGSD_CONFIG_FILE_NAME: string = '.xgsd.json' as const

export type ConfigOpts = {throw: boolean}

export type CliConfig = {}

export class ConfigFile {
  constructor(
    public readonly cwd: string,
    private readonly opts: ConfigOpts = {throw: false},
  ) {}

  load() {
    const path = join(this.cwd, XGSD_CONFIG_FILE_NAME)
    if (!pathExistsSync(path)) {
      if (!this.opts.throw) return

      throw new Error(`${path} does not exist, cannot load config`)
    }

    return readJsonSync(path)
  }
}
