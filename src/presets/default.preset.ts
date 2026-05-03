import {DefaultOrchestrator, ProcessExecutor, RuntimePreset} from '@xgsd/runtime'
import {UserLogsPlugin} from '../plugins/user-logs.plugin'
import {MetricsPlugin} from '../plugins/metrics.plugin'

export function defaultPreset(opts: any): Partial<RuntimePreset> {
  return {
    plugins: [new UserLogsPlugin(), new MetricsPlugin(opts)],
    executor: ProcessExecutor,
    orchestrator: DefaultOrchestrator,
  }
}
