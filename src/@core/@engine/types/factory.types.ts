import {Hooks} from './hooks.types'
import {Executor} from './generics/executor.interface'
import {Logger} from './interfaces/logger.interface'
import {Plugin} from './interfaces/plugin.interface'
import {ProjectContext} from './project.types'
import {Reporter} from './interfaces/reporter.interface'

export type Factory<T> = (ctx: ProjectContext) => T
export type FactoryInput<T> = T | Factory<T> | (new (ctx: ProjectContext) => T)

export type ExecutorFactory = Factory<Executor>
export type ExecutorInput = FactoryInput<Executor>

export type PluginFactory = Factory<Plugin>
export type PluginInput = FactoryInput<Plugin>

export type LoggerFactory = Factory<Logger>
export type LoggerInput = FactoryInput<Logger>

export type ReporterFactory = Factory<Reporter>
export type ReporterInput = FactoryInput<Reporter>
