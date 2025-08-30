import {debug} from '../util/debug.util'
import {RunFn} from './types/runnable.types'
import {setTimeout as sleep} from 'timers/promises'
import {Worker} from 'worker_threads'

export type RunnerOpts = {
  errors?: any[]
  attempt?: number
  retries?: number
  timeout?: number
  cancelled?: boolean
  mode?: 'local' | 'isolated'
  delay?: (attempt: number) => number
  onAttempt?: (attempt: number, error: any, cancel: () => void) => void
}

export type RunnerResult<T, E = Error> = {
  data: T
  error?: E
  errors?: E[]
  retries?: number
  state?: 'error' | 'timeout'
}

function runInWorker<T, R>(fn: (data: T) => R | Promise<R>, data: T, ms: number): Promise<R> {
  const name = fn.name || 'usercode'
  debug('starting worker process for isolated run', runInWorker.name, name, data as any)

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      `
      const { parentPort } = require('worker_threads');
      parentPort.on('message', async ({fn, data}) => {
        try {
          const f = eval(fn); // careful: only safe for your trusted/external model
          const result = await f(data);
          parentPort.postMessage({result});
        } catch (err) {
          parentPort.postMessage({error: err.message});
        }
      });
      `,
      {eval: true, workerData: {data}},
    )

    debug('worker process started up', runInWorker.name, name, data as any)

    const timer = setTimeout(() => {
      debug('worker has process timed out', runInWorker.name, name)
      worker.terminate()
      reject(new Error('Timeout'))
    }, ms)

    worker.on('message', ({result, error}) => {
      debug('response received from worker', runInWorker.name, name, {result, error})
      clearTimeout(timer)
      worker.terminate()
      if (error) reject(new Error(error))
      else resolve(result)
    })

    worker.postMessage({fn: fn.toString(), data})
  })
}

async function timeout<T>(ms: number, task: () => Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout
  return Promise.race<T>([
    task(),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Timeout')), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}

function isTimerHandle(h: any): h is NodeJS.Timeout {
  return h && typeof h.hasRef === 'function' && typeof h.refresh === 'function'
}

export const timedRunnerFn = async (data: any, fn: RunFn<any, any>, opts?: RunnerOpts): Promise<RunnerResult<any>> => {
  const start = performance.now()
  const result = await runnerFn(data, fn, opts)
  const end = performance.now()

  const successful = result.error === undefined
  debug(
    `executed in ${(end - start).toFixed(2)}ms - ${successful ? 'succeeded' : 'failed'} `,
    timedRunnerFn.name,
    fn.name || 'usercode',
  )

  return result
}

/**
 *  Pure runner function, doesn't manage retries or timeouts
 *  Simply calls the provided function with the given data and returns the result.
 *  If an error occurs, it's caught and returned in the result (doesn't throw)
 *  If the function times out, the error is also caught and returned.
 *  @param data - input data for the function
 *  @param fn - function to be executed
 *  @param opts - options for the runner
 *  @returns {RunnerResult<any>} - result of the function execution
 *  @since v1
 *  @version v1
 */
export const runner = async (data: any, fn: RunFn<any, any>, opts?: RunnerOpts): Promise<RunnerResult<any>> => {
  try {
    let result
    if (opts?.mode === 'isolated') {
      result = await runInWorker(fn, data, opts?.timeout ?? 500)
    } else {
      result = await timeout(opts?.timeout ?? 500, () => Promise.resolve(fn(data)))
    }

    return {data: result}
  } catch (error: any) {
    return {data: null, error}
  }
}

export const runnerFn = async (data: any, fn: RunFn<any, any>, opts?: RunnerOpts): Promise<RunnerResult<any>> => {
  let {retries, attempt, timeout, errors, delay, onAttempt, cancelled, mode} = Object.assign(
    {
      timeout: 500,
      attempt: 0,
      retries: 1,
      errors: [],
      cancelled: false,
      mode: 'local',
      delay: (attempt: number) => attempt * 100,
      onAttempt: (attempt: number, errors: any[]) => {},
    },
    opts,
  )

  const fnName = fn.name || 'usercode'
  debug('running function', runnerFn.name, fnName, opts)

  const cancel = () => {
    cancelled = true
    debug('cancel hook called, cancelled is now: ' + cancelled, runnerFn.name, fnName)
  }

  if (cancelled) {
    let last = errors.length !== 1 ? errors[errors.length - 1] : 0
    debug(`function has been cancelled`, runnerFn.name, fnName)
    return {data: null, error: errors[last], retries, errors}
  }

  const runnerResult = await runner(data, fn, {
    timeout,
    errors,
    attempt,
    retries,
    onAttempt,
    cancelled,
    mode: opts?.mode,
  })

  // successful path
  if (!runnerResult.error) {
    debug(`function resolved successfully, data will be returned`, runnerFn.name, fnName, data)
    return runnerResult
  }

  // error path
  debug(`function resulted with error: ${runnerResult.error.message}`, runnerFn.name, fnName)
  errors.push(runnerResult.error)
  onAttempt(attempt, runnerResult.error, cancel)

  if (retries === 0) {
    debug(`retry logic is disabled, exiting now`, runnerFn.name, fnName)
    return {data: null, error: errors[errors.length - 1], retries, errors}
  }

  debug(
    `retrying execution, attempt: ${attempt + 1}/${retries}. Next attempt: ${delay(attempt)}ms.`,
    runnerFn.name,
    fnName,
  )

  const nextAttempt = attempt + 1
  if (nextAttempt >= retries) {
    debug(`failed to execute function: ${fnName} after ${attempt + 1} attempts`, runnerFn.name, fnName)
    errors.push(new Error('Max retries exceeded'))
    return {data: null, error: errors[errors.length - 1], retries, errors}
  }

  await new Promise((resolve) => setTimeout(resolve, delay(attempt)))

  if (cancelled) {
    debug(`function cancelled before retry handler`, runnerFn.name, fnName)
    return {data: null, error: errors[errors.length - 1], retries, errors}
  }

  debug(`retrying now...`, runnerFn.name, fnName)

  return runnerFn(data, fn, {retries, attempt: attempt + 1, timeout, errors, onAttempt, cancelled, mode})
}
