import {SourceData} from '../../@types/pipeline.types'
import {WrappedError, timeout} from '../runner'
import {RunFn} from '../types/runnable.types'
import * as mils from 'ms'

/**
 *  entry point for executing RunFn for both internal
 *  and usercode use. Ensure that this is called
 *  from within the child process, as this function
 *  doesn't isolate through workers/processes.
 *  @param {T} data
 *  @param {RunFn<T, R>} fn
 *  @returns
 *  @note T and R must extend SourceData (see @types/pipeline.types.ts)
 */
export async function execute<
  T extends SourceData = SourceData,
  R extends SourceData = SourceData,
  E extends WrappedError = WrappedError,
>(
  data: T,
  fn: RunFn<T, R>,
  transformer?: (data: R) => any,
  ms?: number | string,
): Promise<{data: R | null; error: E | null}> {
  let time: number = ms as number
  if (typeof ms === 'string') {
    time = mils(ms as mils.StringValue)
  }

  try {
    const result = await timeout(time || 100, () => fn(data))
    return {
      data: transformer ? transformer(result) : result,
      error: null,
    }
  } catch (error: any) {
    let wrapped = {original: error, name: 'see original', message: 'see original', stack: 'see original'} as E

    if (typeof error === 'object' && error !== null) {
      wrapped = {
        original: error,
        name: error.name || 'see original',
        message: error.message || 'see original',
        stack: error.stack || 'see original',
      } as E
    }

    if (typeof error === 'string') {
      wrapped = {original: error, name: error, message: error, stack: 'unknown'} as any
    }

    return {data: null, error: wrapped}
  }
}
