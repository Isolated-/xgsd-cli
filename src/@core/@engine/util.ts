import {WorkflowError, WorkflowErrorCode} from './error'
import {Block} from './types/block.types'
import {ProjectContext} from './types/project.types'

export async function importUserModule(block: Block, context: ProjectContext) {
  try {
    const action = block.run!
    const fn = await import(context.package)
    return fn[action]
  } catch (error: any) {
    throw new WorkflowError(
      `${context.package} couldn't be loaded. This could mean it wasn't found, or there's an error preventing its load. Check logs for more information. (${error.message})`,
      WorkflowErrorCode.ModuleNotFound,
    )
  }
}
