import {Hooks} from './hooks.types'
import {Executor} from './generics/executor.interface'
import {Logger} from './interfaces/logger.interface'
import {Plugin} from './interfaces/plugin.interface'
import {ProjectContext} from './project.types'

export type Factory<T> = (ctx: ProjectContext) => T
export type FactoryInput<T> = T | Factory<T> | (new (ctx: ProjectContext) => T)

export type ExecutorFactory = Factory<Executor>
export type ExecutorInput = ExecutorFactory

export type PluginFactory = Factory<Plugin>
export type PluginInput = PluginFactory

export type LoggerFactory = Factory<Logger>
export type LoggerInput = LoggerFactory
