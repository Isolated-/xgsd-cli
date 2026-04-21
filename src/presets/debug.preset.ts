import {RuntimePreset} from '../@runtime/bootstrap'
import {DebugLogger} from '../@runtime/loggers/debug.logger'
import {DebugPlugin} from '../@runtime/plugins/debug.plugin'

export function debugPreset(): RuntimePreset {
  return {
    plugins: [DebugPlugin],
    loggers: [DebugLogger],
  }
}
