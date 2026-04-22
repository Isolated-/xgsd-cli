import {RuntimePreset} from '@xgsd/runtime'
import {DebugLogger} from '../loggers/debug.logger'
import {DebugPlugin} from '../plugins/debug.plugin'

export function debugPreset(): RuntimePreset {
  return {
    plugins: [DebugPlugin],
    loggers: [DebugLogger],
  }
}
