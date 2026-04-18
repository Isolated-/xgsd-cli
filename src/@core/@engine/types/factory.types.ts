import {Hooks} from './hooks.types'
import {Executor} from './interfaces/executor.interface'
import {ProjectContext} from './project.types'

export type Factory<T> = (ctx: ProjectContext) => T
export type FactoryInput<T> = T | Factory<T> | (new (ctx: ProjectContext) => T)

export type ExecutorFactory = (ctx: ProjectContext) => Executor
export type ExecutorInput = Executor | ExecutorFactory | (new (ctx: ProjectContext) => Executor)

export type PluginFactory = (ctx: ProjectContext) => Hooks
export type PluginInput = Hooks | PluginFactory | (new (ctx: ProjectContext) => Hooks)
