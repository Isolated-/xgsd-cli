import {SystemEvent} from '../@engine/types/events.types'
import {Plugin} from '../@engine/types/interfaces/plugin.interface'
import {byteSize} from '../util/misc.util'
import prettyBytes from 'pretty-bytes'

export class DebugPlugin implements Plugin {
  async on(e: any): Promise<void> {
    const {event, payload} = e

    console.log(`[DebugPlugin] event ${event}`)

    if (event === SystemEvent.ExtensionLoaded || event === SystemEvent.ExtensionUnloaded) {
      const loaded = event === SystemEvent.ExtensionLoaded ? 'loaded' : 'unloaded'
      console.log(`[DebugPlugin] extension ${loaded}: ${payload.name} (core: ${payload.core})`)
    }

    console.log(`[DebugPlugin] size of this event is ${prettyBytes(byteSize(payload))}`)
  }
}
