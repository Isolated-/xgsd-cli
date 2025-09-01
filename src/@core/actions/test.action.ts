import {RunFn} from '../@shared/types/runnable.types'

export const testActionFn: RunFn<any, any> = async (data: any) => {
  if (typeof data === 'string') {
    return Promise.resolve(data.toLocaleUpperCase())
  }
  return Promise.resolve(data)
}
