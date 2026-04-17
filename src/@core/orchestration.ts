import {EventEmitter2} from 'eventemitter2'
import {ensureDirSync} from 'fs-extra'
import {WorkflowContext} from './@engine/context.builder'
import {BasicOrchestrator} from './@engine/orchestration/basic.orchestrator'
import {IsolatedOrchestrator} from './@engine/orchestration/isolated.orchestrator'
import {SourceData, FlexibleWorkflowConfig} from './@types/pipeline.types'
import {userCodeLogCollector} from './log-collector'
import {createPluginManager} from './@engine/plugins/plugin.util'
import {LoggerPlugin} from './plugins/logger.plugin'
import {captureRunnerEvents} from './@engine/plugins/plugin.lifecycle'
import {ReporterPlugin} from './plugins/reporter.plugin'
import {UserHooksPlugin} from './plugins/userhooks.plugin'
import {ProjectContext} from './@engine/types/project.types'

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

  if (collect?.logs) {
    userCodeLogCollector(ctx, config.output, ctx.stream)
  }

  // plugin layer (added in v0.5)
  const manager = createPluginManager(ctx as ProjectContext, [
    ReporterPlugin,
    LoggerPlugin,
    (ctx) => new UserHooksPlugin(ctx),
  ])

  captureRunnerEvents(manager, ctx as ProjectContext)

  await orchestrator.orchestrate()
}
