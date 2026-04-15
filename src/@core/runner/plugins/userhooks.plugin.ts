import {WorkflowError, WorkflowErrorCode} from '../../@shared/workflow.error'
import {Block, Hooks, ProjectContext} from '../runner.types'

let cachedModule: any = null

const hookMap = {
  projectStart: 'onProjectStart',
  projectEnd: 'onProjectEnd',
} as const

function loadUserModule(context: ProjectContext) {
  if (cachedModule) return cachedModule

  try {
    cachedModule = require(context.package)
    return cachedModule
  } catch (error: any) {
    throw new WorkflowError(
      `${context.package} couldn't be loaded. (${error.message})`,
      WorkflowErrorCode.ModuleNotFound,
    )
  }
}

export class UserHooksPlugin implements Hooks {
  private module: any
  constructor(private readonly context: ProjectContext) {
    this.module = loadUserModule(context)
  }

  private async callHook(name: keyof typeof hookMap, ...args: any[]) {
    const fnName = hookMap[name]
    const fn = this.module?.[fnName]

    if (typeof fn !== 'function') return

    try {
      await fn(...args)
    } catch (error: any) {
      // Don't crash the system — log instead
      console.error(`[UserCodeHook] ${fnName} failed: ${error.message}`)
    }
  }

  async projectStart(context: ProjectContext) {
    await this.callHook('projectStart', context)
  }

  async projectEnd(context: ProjectContext) {
    await this.callHook('projectEnd', context)
  }

  async blockStart(_context?: ProjectContext, block?: Block) {}
  async blockEnd(_context?: ProjectContext, block?: Block) {}
}
