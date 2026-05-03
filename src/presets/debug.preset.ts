import {RuntimePreset} from '@xgsd/runtime'
import {DebugPlugin} from '../plugins/debug.plugin'

export function debugPreset(): Partial<RuntimePreset> {
  return {
    plugins: [DebugPlugin],
  }
}
