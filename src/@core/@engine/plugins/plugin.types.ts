import {Hooks} from '../../@types/hooks.types'
import {ProjectContext} from '../types/project.types'

export type PluginFactory = (ctx: ProjectContext) => Hooks
export type PluginInput = Hooks | PluginFactory | (new (ctx: ProjectContext) => Hooks)
