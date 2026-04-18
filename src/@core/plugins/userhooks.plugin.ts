import {WorkflowError, WorkflowErrorCode} from '../@engine/error'
import {ProjectContext} from '../@engine/types/project.types'
import {Hooks} from '../@engine/types/hooks.types'
import {Block} from '../@engine/types/block.types'
import {RetryAttempt} from '../@engine/types/retry.types'
import {Plugin} from '../@engine/types/interfaces/plugin.interface'

let cachedModule: any = null

const hookMap = {
  // lifecycle
  onMessage: 'onMessage',
  // project/block
  projectStart: 'onProjectStart',
  projectEnd: 'onProjectEnd',
  blockStart: 'onBlockStart',
  blockEnd: 'onBlockEnd',
  blockRetry: 'onBlockRetry',
  blockWait: 'onBlockWait',
  blockSkip: 'onBlockSkipped',
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

export class UserHooksPlugin implements Plugin {
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

  async onMessage(event: any, context: ProjectContext): Promise<void> {
    this.callHook('onMessage', event, context)
  }

  async projectStart(context: ProjectContext) {
    await this.callHook('projectStart', context)
  }

  async projectEnd(context: ProjectContext) {
    await this.callHook('projectEnd', context)
  }

  async blockStart(context: ProjectContext, block: Block) {
    await this.callHook('blockStart', context, block)
  }

  async blockEnd(context: ProjectContext, block: Block) {
    await this.callHook('blockEnd', context, block)
  }

  async blockWait(context: ProjectContext, block: Block): Promise<void> {
    await this.callHook('blockWait', context, block)
  }

  async blockRetry(context: ProjectContext, block: Block, attempt: RetryAttempt): Promise<void> {
    await this.callHook('blockRetry', context, block, attempt)
  }

  async blockSkip(context: ProjectContext, block: Block): Promise<void> {
    await this.callHook('blockSkip', context, block)
  }
}
