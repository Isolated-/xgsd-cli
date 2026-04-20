import {Context} from '../config'
import {FatalError, FatalErrorCode} from '../error'
import {importUserModule} from '../extension/util'
import {ProjectEvent, BlockEvent, SystemEvent} from '../types/events.types'
import {Plugin} from '../types/interfaces/plugin.interface'
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

// slightly different versions of this
// across the project
// when extracting to @xgsd/runtime
// create a single source of truth
async function loadUserModule(context: Context) {
  if (cachedModule) return cachedModule

  try {
    cachedModule = await importUserModule(context)
    return cachedModule
  } catch (error: any) {
    throw new FatalError(`${context.packagePath} couldn't be loaded. (${error.message})`, FatalErrorCode.ModuleNotFound)
  }
}

export class UserHooksPlugin implements Plugin {
  private module: any

  async init(context: Context): Promise<void> {
    this.module = await loadUserModule(context)
  }

  private async callHook(data: {event: keyof typeof eventToHookMap; payload: unknown}) {
    // drop the envelope when calling hooks
    const {event, payload} = data

    const fnName = eventToHookMap[event]
    const fn = this.module?.[fnName]

    if (typeof fn !== 'function') return

    try {
      await fn(payload)
    } catch (error: any) {
      // Don't crash the system — log instead
      console.error(`[UserCodeHook] ${fnName} failed: ${error.message}`)
    }
  }

  async on(event: any): Promise<void> {
    await this.callHook(event)
  }
}
