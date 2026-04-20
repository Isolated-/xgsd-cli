import {SystemEvent} from '../@engine/types/events.types'
import {Plugin} from '../@engine/types/interfaces/plugin.interface'

export class DebugPlugin implements Plugin {
  async on<T = unknown>(event: string, payload: any): Promise<void> {
    console.log(`[DebugPlugin] event ${event}`)

    if (event === SystemEvent.ExtensionLoaded || event === SystemEvent.ExtensionUnloaded) {
      const loaded = event === SystemEvent.ExtensionLoaded ? 'loaded' : 'unloaded'
      console.log(`[DebugPlugin] extension ${loaded}: ${payload.payload.name}`)
    }
  }
}
