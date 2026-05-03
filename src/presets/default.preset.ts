import {DefaultOrchestrator, ProcessExecutor, RuntimePreset} from '@xgsd/runtime'
import {UserLogsPlugin} from '../plugins/user-logs.plugin'
import {MetricsPlugin} from '../plugins/metrics.plugin'
import {ReporterPlugin} from '../plugins/reporter.plugin'
import {UserHooksPlugin} from '../plugins/userhooks.plugin'

export function defaultPreset(opts: any): Partial<RuntimePreset> {
  return {
    plugins: [new UserLogsPlugin(), new UserHooksPlugin(opts), new MetricsPlugin(opts), new ReporterPlugin(opts)],
    executor: ProcessExecutor,
    orchestrator: DefaultOrchestrator,
  }
}
