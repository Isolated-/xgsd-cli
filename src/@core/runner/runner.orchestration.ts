import EventEmitter2 from 'eventemitter2'
import {ensureDirSync} from 'fs-extra'
import {WorkflowContext} from '../@engine/context.builder'
import {BasicOrchestrator} from '../@engine/orchestration/basic.orchestrator'
import {IsolatedOrchestrator} from '../@engine/orchestration/isolated.orchestrator'
import {SourceData, FlexibleWorkflowConfig} from '../@types/pipeline.types'
import {captureRunnerEvents} from './runner.lifecycle'
import {userCodeLogCollector} from './runner.log-collector'
import {ProjectContext} from './runner.types'
import {ReporterPlugin} from './plugins/reporter.plugin'
import {LoggerPlugin} from './plugins/logger.plugin'
import {UserHooksPlugin} from './plugins/userhooks.plugin'
import {createPluginManager} from './plugin.container'

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

  captureRunnerEvents(manager, ctx)

  await orchestrator.orchestrate()
}
