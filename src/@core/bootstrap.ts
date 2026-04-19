import {EventEmitter2} from 'eventemitter2'
import {ensureDirSync} from 'fs-extra'
import {WorkflowContext} from './@engine/context.builder'
import {SourceData, FlexibleWorkflowConfig} from './@types/pipeline.types'
import {attachManagerLifecycleListeners, attachProcessLogAdapter} from './@engine/extension/lifecycle'
import {UserHooksPlugin} from './plugins/userhooks.plugin'
import {ProjectContext} from './@engine/types/project.types'
import {deepmerge2} from './util/object.util'
import {Orchestrator} from './@engine/orchestrator'
import {createRuntime} from './@engine/extension/util'
import {DebugLogger} from './loggers/debug.logger'
import {LogAdapterPlugin} from './plugins/log-adapter.plugin'

/**
 *  @param {any} data
 *  @param {FlexibleWorkflowConfig} config
 *  @param {EventEmitter2} event
 *  @param {boolean} lite
 *
 */
export const runProject = async <T extends SourceData = SourceData>(
  data: any,
  config: FlexibleWorkflowConfig<T>,
  event?: EventEmitter2,
  lite: boolean = false,
) => {
  const handler = event ?? new EventEmitter2()
  const {collect} = config

  const ctx = new WorkflowContext(config, handler, 'v1')

  if (collect) {
    ensureDirSync(config.output)
  }

  // plugins + executor added in v0.5
  // executor allows users to override how
  // blocks are processed (in process/isolation/remote/etc)
  // hooks provide a simple way of reacting to events
  // these are registered as a plugin
  const {pluginManager, loggerManager, reporterManager, executor} = await createRuntime({
    context: ctx as WorkflowContext,
    loggers: [DebugLogger],
    plugins: [LogAdapterPlugin, (ctx) => new UserHooksPlugin(ctx)],
    reporters: [],
  })

  const orchestrator = new Orchestrator<T>(ctx, executor as any)

  attachManagerLifecycleListeners(loggerManager, ctx as ProjectContext)
  attachManagerLifecycleListeners(pluginManager, ctx as ProjectContext)
  attachManagerLifecycleListeners(reporterManager, ctx as ProjectContext)

  // process log adapter (added in v0.5)
  // instead of this, attach directly to loggers
  await attachProcessLogAdapter(ctx as ProjectContext, loggerManager)

  const input = deepmerge2(config.data, data) as T

  await orchestrator.orchestrate(input)
}
