import {RunFn} from '../@shared/types/runnable.types'

export const testActionFn = (data: string): Promise<string> => {
  return Promise.resolve(data.toUpperCase())
}
