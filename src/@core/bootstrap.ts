import {EventEmitter2} from 'eventemitter2'
import {ensureDirSync} from 'fs-extra'
import {WorkflowContext} from './@engine/context.builder'
import {SourceData, FlexibleWorkflowConfig} from './@types/pipeline.types'
import {createPluginManager} from './@engine/plugins/plugin.util'
import {LoggerPlugin} from './plugins/logger.plugin'
import {attachPluginEventListeners} from './@engine/plugins/plugin.lifecycle'
import {ReporterPlugin} from './plugins/reporter.plugin'
import {UserHooksPlugin} from './plugins/userhooks.plugin'
import {ProjectContext} from './@engine/types/project.types'
import {attachProcessLogAdapter} from './@engine/logs'
import {deepmerge2} from './util/object.util'
import {InProcessExecutor} from './@engine/executors/in-process.executor'
import {ProcessExecutor} from './@engine/executors/process.executor'
import {Orchestrator} from './@engine/orchestrator'

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
  const executor = lite ? new InProcessExecutor<T>() : new ProcessExecutor<T>()
  const orchestrator = new Orchestrator<T>(ctx, executor)

  if (collect) {
    ensureDirSync(config.output)
  }

  // plugin layer (added in v0.5)
  const pluginManager = createPluginManager(ctx as ProjectContext, [
    ReporterPlugin,
    LoggerPlugin,
    (ctx) => new UserHooksPlugin(ctx),
  ])

  attachPluginEventListeners(pluginManager, ctx as ProjectContext)

  // process log adapter (added in v0.5)
  attachProcessLogAdapter(ctx as ProjectContext)

  const input = deepmerge2(config.data, data) as T

  await orchestrator.orchestrate(input)
}
