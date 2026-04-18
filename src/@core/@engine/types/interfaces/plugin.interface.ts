import {WorkflowContext} from '../../context.builder'
import {Hooks} from '../hooks.types'

export interface Plugin extends Hooks {
  init?(ctx: WorkflowContext): Promise<void>
}
