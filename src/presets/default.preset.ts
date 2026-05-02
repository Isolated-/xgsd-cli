import {DefaultOrchestrator, ProcessExecutor, RuntimePreset} from '@xgsd/runtime'
import {ReporterPlugin} from '../plugins/reporter.plugin'
import {UserLogsPlugin} from '../plugins/user-logs.plugin'
import {UsagePlugin} from '../plugins/usage.plugin'

export function defaultPreset(opts: any): Partial<RuntimePreset> {
  return {
    plugins: [new UserLogsPlugin(), new UsagePlugin(opts)],
    executor: ProcessExecutor,
    orchestrator: DefaultOrchestrator,
  }
}
