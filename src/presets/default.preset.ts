import {ProcessExecutor, RuntimePreset} from '@xgsd/runtime'
import {UserHooksPlugin} from '../plugins/userhooks.plugin'

export function defaultPreset(): RuntimePreset {
  return {
    plugins: [UserHooksPlugin],
    executor: ProcessExecutor,
  }
}
