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
import {ConfigParser, createContext} from './config'
import * as Joi from 'joi'
import {join} from 'path'
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

  const bus = new EventBus(handler)

  // new config parser
  const parser = new ConfigParser(join(config.package!, 'config.yaml'))

  const schema = Joi.object()

  const conf = parser
    .load()
    .parse()
    .default({
      // defaults
    })
    .validate((input) => schema.validate(input).value)
    .build() as {project: any; blocks: any[]}

  const ctx = createContext(config.package!).config(conf).bus(bus).meta().data(data).blocks().build()

  // otherwise use it
  /*
  const ctx = new WorkflowContext(config, handler, 'v1')
*/
  // plugins + executor added in v0.5
  // executor allows users to override how
  // blocks are processed (in process/isolation/remote/etc)
  // hooks provide a simple way of reacting to events
  // these are registered as a plugin
  const {pluginManager, loggerManager, executor} = await createRuntime({
    ctx,
    loggers: [DebugLogger],
    plugins: [DebugPlugin],
    bus,
  })

  /*const orchestrator = new Orchestrator<T>(ctx, executor as any, bus)*/

  bindEventBusToLoggerManager(bus, loggerManager)
  attachManagerLifecycleListeners(pluginManager, bus)

  //  await executor.init?.(ctx as ProjectContext)
  await loggerManager.init(ctx)
  await pluginManager.init(ctx)

  const input = deepmerge2(config.data, data) as T

  //await orchestrator.orchestrate(input)

  // clean this up
  await pluginManager.exit(ctx)
  await loggerManager.exit(ctx)
}

export class ManagerFacade {}
