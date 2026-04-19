// this will eventually become its own library (@xgsd/sdk)
import {getBackoffStrategy} from './@core/@engine/execution/backoff'
import {retry as coreRetry} from './@core/@engine/execution/retry'
import {execute as coreExecute} from './@core/@engine/execution/execute'
import {RetryAttempt} from './@core/@engine/types/retry.types'
import {RunFn} from './@core/@engine/types/runnable.types'

export type RetryOpts = {
  retries?: number
  timeout?: number
  backoff?: 'linear' | 'exponential' | 'squaring' | 'manual'
}

/**
 *  retry() is usually called for your blocks inside a child process.
 *
 *  Use this method when creating new Plugins, Loggers, or Reporters
 *  to ensure retry logic is built in to your extension.
 *
 *  Note: do not call retry() from within your blocks.
 *  This is unneeded and will lead to unexpected results.
 *
 *  @param run
 *  @param data
 *  @param opts
 *  @param attempt
 *  @returns
 */
export async function retry(run: RunFn<any, any>, data?: any, opts?: RetryOpts, attempt?: (a: RetryAttempt) => void) {
  return coreRetry(data, run, opts?.retries || 1, {
    timeout: opts?.timeout || 1000,
    delay: getBackoffStrategy(opts?.backoff || 'exponential'),
    onAttempt: attempt,
  })
}

export type ExecuteOpts = {
  timeout?: number
  transform?: (data: any) => any
}

export async function execute(run: RunFn<any, any>, data?: any, opts?: ExecuteOpts) {
  return coreExecute(data, run, opts?.transform, opts?.timeout)
}

export {processStep} from './@core/@engine/process/block.process'
export {ProcessExecutor} from './@core/@engine/executors/process.executor'
export {InProcessExecutor} from './@core/@engine/executors/in-process.executor'
