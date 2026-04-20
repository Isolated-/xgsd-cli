import {EventEmitter2} from 'eventemitter2'
import {FlexibleWorkflowConfig} from './@types/pipeline.types'
import {attachManagerLifecycleListeners, bindEventBusToLoggerManager} from './@engine/extension/lifecycle'
import {deepmerge2} from './util/object.util'
import {createRuntime} from './@engine/extension/util'
import {DebugLogger} from './loggers/debug.logger'
import {DebugPlugin} from './plugins/debug.plugin'
import {ConfigParser, ConfigType, Context, createContext} from './config'
import * as Joi from 'joi'
import {join} from 'path'
import {EventBus} from './@engine/event'
import {Orchestrator} from './@engine/orchestrator'
import {SourceData} from '@xgsd/engine'
import {ProjectConfig} from './@engine/types/project.types'
import {Manager} from './@engine/types/generics/manager.interface'

export const dispatchToManagers = async (opts: {
  managers: Manager[]
  type: 'init' | 'exit'
  ctx: Context<SourceData>
}) => {
  const {managers, type, ctx} = opts

  for (const manager of managers) {
    await manager[type](ctx)
  }
}

/**
 *  @param {any} data
 *  @param {FlexibleWorkflowConfig} config
 *  @param {EventEmitter2} event
 *  @param {boolean} lite
 *
 */
export const runProject = async (data: any, config: ProjectConfig, event?: EventEmitter2, lite: boolean = false) => {
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

  const liteMode = lite || !!conf.project.lite
  const ctx = createContext(config.package!).config(conf).bus(bus).meta().data(data).blocks().lite(liteMode).build()

  // plugins + executor added in v0.5
  // executor allows users to override how
  // blocks are processed (in process/isolation/remote/etc)
  // hooks provide a simple way of reacting to events
  // these are registered as a plugin
  const {pluginManager, loggerManager, executor} = await createRuntime({
    ctx,
    bus,
    loggers: [DebugLogger],
    plugins: [DebugPlugin],
  })

  const orchestrator = new Orchestrator(ctx, executor as any, bus)

  bindEventBusToLoggerManager(bus, loggerManager)
  attachManagerLifecycleListeners(pluginManager, bus)

  //  await executor.init?.(ctx as ProjectContext)
  await dispatchToManagers({
    ctx,
    managers: [loggerManager, pluginManager],
    type: 'init',
  })

  const input = deepmerge2(config.data, data)

  await orchestrator.orchestrate(input as SourceData)

  // clean this up
  await dispatchToManagers({
    ctx,
    managers: [loggerManager, pluginManager],
    type: 'exit',
  })
}
