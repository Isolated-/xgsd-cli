import {Context} from '../../../config'

export interface Manager<T extends Record<string, unknown> = Record<string, unknown>> {
  init(ctx: Context): Promise<void>
  exit(ctx: Context): Promise<void>
  emit<T = unknown>(event: string, payload: T): Promise<void>
}
