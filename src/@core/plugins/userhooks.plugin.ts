import {WorkflowError, WorkflowErrorCode} from '../@engine/error'
import {ProjectContext} from '../@engine/types/project.types'
import {Plugin} from '../@engine/types/interfaces/plugin.interface'
import {ProjectEvent, BlockEvent, SystemEvent} from '../@engine/types/events.types'

let cachedModule: any = null

const eventToHookMap = {
  // project events
  [ProjectEvent.Started]: 'onProjectStart',
  [ProjectEvent.Ended]: 'onProjectEnd',

  // block events
  [BlockEvent.Started]: 'onBlockStart',
  [BlockEvent.Ended]: 'onBlockEnd',
  [BlockEvent.Retrying]: 'onBlockRetry',
  [BlockEvent.Skipped]: 'onBlockSkip',
  [BlockEvent.Waiting]: 'onBlockWait',
  [BlockEvent.Failed]: 'onBlockFail',

  // system events
  [SystemEvent.ExtensionLoaded]: 'onExtensionLoad',
  [SystemEvent.ExtensionUnloaded]: 'onExtensionUnload',
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

  private async callHook(name: keyof typeof eventToHookMap, ...args: any[]) {
    const fnName = eventToHookMap[name]
    const fn = this.module?.[fnName]

    if (typeof fn !== 'function') return

    try {
      await fn(...args)
    } catch (error: any) {
      // Don't crash the system — log instead
      console.error(`[UserCodeHook] ${fnName} failed: ${error.message}`)
    }
  }

  async on<T = unknown>(event: any): Promise<void> {
    await this.callHook(event.event, event.payload)
  }
}
