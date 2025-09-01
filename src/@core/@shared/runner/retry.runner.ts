import {execute, WrappedError, timeout as withTimeout} from '../runner'
import {RunFn} from '../types/runnable.types'

export type RetryAttempt = {
  attempt: number
  error: WrappedError
  nextMs: number
  finalAttempt: boolean
}

/**
 * Retry a function call with exponential backoff.
 * @param {T} data - The input data for the function.
 * @param {RunFn<T, R>} fn - The function to retry.
 * @param {number} retries - The number of retry attempts.
 * @param {object} opts - Options for the retry behavior.
 * @returns {Promise<R|null>} The result of the function call or null if all retries fail.
 */
export async function retry<T, R = T>(
  data: T,
  fn: RunFn<T, R>,
  retries: number,
  opts?: {
    timeout?: number
    delay?: (attempt: number) => number
    onAttempt?: (attempt: RetryAttempt) => void
  },
) {
  let attempt = 0
  let finalError: WrappedError | null = null

  while (attempt < retries) {
    const execution = await execute<T, R, WrappedError>(data, fn, undefined, opts?.timeout)

    if (!execution.error) {
      return {data: execution.data}
    }

    let delay = 0
    if (opts?.delay) {
      delay = opts.delay(attempt)
    }

    if (opts?.onAttempt) {
      opts.onAttempt({attempt, error: execution.error!, finalAttempt: attempt === retries - 1, nextMs: delay})
    }

    if (opts?.delay) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    finalError = execution.error!

    attempt++
  }

  return {error: finalError}
}
