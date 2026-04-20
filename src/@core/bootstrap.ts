import {EventEmitter2} from 'eventemitter2'
import {ensureDirSync} from 'fs-extra'
import {WorkflowContext} from './@engine/context.builder'
import {SourceData, FlexibleWorkflowConfig} from './@types/pipeline.types'
import {attachManagerLifecycleListeners, bindEventBusToLoggerManager} from './@engine/extension/lifecycle'
import {UserHooksPlugin} from './plugins/userhooks.plugin'
import {ProjectContext} from './@engine/types/project.types'
import {deepmerge2} from './util/object.util'
import {Orchestrator} from './@engine/orchestrator'
import {createRuntime} from './@engine/extension/util'
import {DebugLogger} from './loggers/debug.logger'
import {DebugPlugin} from './plugins/debug.plugin'
import {EventBus} from '@xgsd/engine'
import {SystemEvent} from './@engine/types/events.types'
import {byteSize} from './util/misc.util'
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

  if (collect) {
    ensureDirSync(config.output)
  }

  const bus = new EventBus(handler)
  const ctx = new WorkflowContext(config, handler, 'v1')

  // plugins + executor added in v0.5
  // executor allows users to override how
  // blocks are processed (in process/isolation/remote/etc)
  // hooks provide a simple way of reacting to events
  // these are registered as a plugin
  const {pluginManager, loggerManager, executor} = await createRuntime({
    context: ctx as WorkflowContext,
    loggers: [DebugLogger],
    plugins: [DebugPlugin, (ctx) => new UserHooksPlugin(ctx)],
    bus,
  })

  const orchestrator = new Orchestrator<T>(ctx, executor as any, bus)

  bindEventBusToLoggerManager(bus, loggerManager)
  attachManagerLifecycleListeners(pluginManager, bus)

  await executor.init?.(ctx as ProjectContext)
  await loggerManager.init(ctx as ProjectContext, bus)
  await pluginManager.init(ctx as ProjectContext, bus)

  const input = deepmerge2(config.data, data) as T

  await orchestrator.orchestrate(input)

  // clean this up
  await pluginManager.exit(ctx as ProjectContext, bus)
  await loggerManager.exit(ctx as ProjectContext, bus)
}
