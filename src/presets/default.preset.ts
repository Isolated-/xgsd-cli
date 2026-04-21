import {RuntimePreset} from '../@runtime/bootstrap'
import {ProcessExecutor} from '../@runtime/executors/process.executor'
import {UserHooksPlugin} from '../@runtime/plugins/userhooks.plugin'

export function defaultPreset(): RuntimePreset {
  return {
    plugins: [UserHooksPlugin],
    executor: ProcessExecutor,
  }
}
