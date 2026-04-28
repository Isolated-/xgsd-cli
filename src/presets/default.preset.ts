import {DefaultOrchestrator, ProcessExecutor, RuntimePreset} from '@xgsd/runtime'
import {UserHooksPlugin} from '../plugins/userhooks.plugin'
import {ReporterPlugin} from '../plugins/reporter.plugin'

export function defaultPreset(opts: any): Partial<RuntimePreset> {
  return {
    plugins: [new UserHooksPlugin(opts), new ReporterPlugin(opts)],
    executor: ProcessExecutor,
    orchestrator: DefaultOrchestrator,
  }
}
