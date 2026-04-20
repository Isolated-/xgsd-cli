import {EventEmitter2} from 'eventemitter2'
import {attachManagerLifecycleListeners, bindEventBusToLoggerManager} from './extension/lifecycle'
import {deepmerge2} from './util/object.util'
import {createRuntime} from './extension/util'
import {DebugLogger} from './loggers/debug.logger'
import {DebugPlugin} from './plugins/debug.plugin'
import {ConfigParser, ConfigType, Context, createContext} from './config'
import * as Joi from 'joi'
import {join} from 'path'
import {SourceData} from '@xgsd/engine'
import {UserHooksPlugin} from './plugins/userhooks.plugin'
import {EventBus} from './event'
import {Orchestrator} from './orchestrator'
import {Manager} from './types/generics/manager.interface'

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

type RunProjectConfig = {
  package: string
}

export const runProject = async (opts: {data: SourceData; config: RunProjectConfig; lite?: boolean}) => {
  const {data, config, lite} = opts

  const bus = new EventBus(
    new EventEmitter2({
      wildcard: true,
    }),
  )

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
  const ctx = createContext(config.package!)
    .config(conf)
    .bus(bus)
    .meta()
    .data(data)
    .blocks()
    .blockCount()
    .lite(liteMode)
    .build()

  // plugins + executor added in v0.5
  // executor allows users to override how
  // blocks are processed (in process/isolation/remote/etc)
  // hooks provide a simple way of reacting to events
  // these are registered as a plugin
  const {pluginManager, loggerManager, executor} = await createRuntime({
    ctx,
    bus,
    loggers: [
      () =>
        new DebugLogger(ctx, {
          levels: ['error', 'warn', 'debug', 'info'],
        }),
    ],
    plugins: [DebugPlugin, UserHooksPlugin],
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

  const input = deepmerge2(conf.project.data, data)

  await orchestrator.orchestrate(input as SourceData)

  // clean this up
  await dispatchToManagers({
    ctx,
    managers: [loggerManager, pluginManager],
    type: 'exit',
  })
}
