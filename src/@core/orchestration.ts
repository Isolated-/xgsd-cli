import {EventEmitter2} from 'eventemitter2'
import {ensureDirSync} from 'fs-extra'
import {WorkflowContext} from './@engine/context.builder'
import {BasicOrchestrator} from './@engine/orchestrators/basic.orchestrator'
import {IsolatedOrchestrator} from './@engine/orchestrators/isolated.orchestrator'
import {SourceData, FlexibleWorkflowConfig} from './@types/pipeline.types'
import {createPluginManager} from './@engine/plugins/plugin.util'
import {LoggerPlugin} from './plugins/logger.plugin'
import {captureRunnerEvents} from './@engine/plugins/plugin.lifecycle'
import {ReporterPlugin} from './plugins/reporter.plugin'
import {UserHooksPlugin} from './plugins/userhooks.plugin'
import {ProjectContext} from './@engine/types/project.types'
import {attachProcessLogAdapter} from './@engine/logs'

export const userCodeOrchestrationv2 = async <T extends SourceData = SourceData>(
  data: any,
  config: FlexibleWorkflowConfig<T>,
  event?: EventEmitter2,
  lite: boolean = false,
) => {
  const handler = event ?? new EventEmitter2()
  const {collect} = config

  const ctx = new WorkflowContext(config, handler, 'v1')
  const orchestrator = lite ? new BasicOrchestrator<T>(ctx) : new IsolatedOrchestrator<T>(ctx)

  if (collect) {
    ensureDirSync(config.output)
  }

  // process log adapter (added in v0.5)
  attachProcessLogAdapter(ctx as ProjectContext)

  // plugin layer (added in v0.5)
  const pluginManager = createPluginManager(ctx as ProjectContext, [
    ReporterPlugin,
    LoggerPlugin,
    (ctx) => new UserHooksPlugin(ctx),
  ])

  captureRunnerEvents(pluginManager, ctx as ProjectContext)

  await orchestrator.orchestrate()
}
