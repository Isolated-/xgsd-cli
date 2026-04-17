import {join} from 'path'
import {ensureDirSync, pathExistsSync, readJsonSync, writeJsonSync} from 'fs-extra'
import {ProjectContext} from '../@engine/types/project.types'
import {Hooks} from '../@types/hooks.types'
import {Block} from '../@engine/types/block.types'

export class ReporterPlugin implements Hooks {
  async projectStart(context: ProjectContext): Promise<void> {
    const path = join(context.output, 'runs')

    ensureDirSync(path)

    writeJsonSync(join(path, `run-${context.start}.json`), context, {spaces: 2})

    if (!pathExistsSync(join(context.output, 'config.json'))) {
      writeJsonSync(join(context.output, 'config.json'), context.config, {spaces: 2, mode: 0o600})
    }
  }

  async projectEnd(context: ProjectContext): Promise<void> {
    const path = join(context.output, 'runs', `run-${context.start}.json`)

    if (!pathExistsSync(path)) {
      // something went really wrong
      return
    }

    const result = readJsonSync(path, {throws: false}) as Record<string, any>
    if (!result) {
      // something went really wrong
      return
    }

    const merged = {...result, ...context}

    writeJsonSync(path, merged, {spaces: 2})
  }

  async blockEnd(context: ProjectContext, block: Block): Promise<void> {}
}
