import {PipelineState} from '../@types/pipeline.types'
import {retry, WrappedError} from './runner'

process.on('message', async (msg: any) => {
  if (msg.type !== 'RUN') return
  const {data, config} = msg
  const {step, options} = config

  let startedAt = new Date().toISOString()

  const log = (message: string, level: string = 'log') => {
    process.send!({type: 'LOG', log: {level, message}})
  }

  log(
    `${step.name} - ${step.description ? step.description : 'no description'} is running using ${
      config.runner
    }, timeout: ${options.timeout}ms, retries: ${options.maxRetries}`,
    'status',
  )

  let userModule
  try {
    userModule = await import(config.package!)
  } catch (error: any) {
    log(`failed to load package: ${config.package}, error: ${error.message}`, 'error')
    process.send!({
      type: 'ERROR',
      error: {
        name: 'Package Load Failure',
        message: `failed to load package: ${config.package}, error: ${error.message}`,
        stack: error.stack,
        fatal: true,
      },
    })
    return
  }

  const fn = userModule[step.action!]
  if (!fn) {
    log(`${step.name} is missing function implementation for: ${step.action}`, 'error')
    process.send!({
      type: 'ERROR',
      error: {
        name: 'Function Load Failure',
        message: `missing function implementation for: ${step.action}`,
        fatal: true,
      },
    })
    return
  }

  let totalRetries = 0
  let errors: WrappedError[] = []
  try {
    log(`${step.name} - executing step`, 'status')
    const result = await retry(data, fn, options.maxRetries || 1, {
      timeout: options.timeout,
      delay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
      onAttempt: (attempt) => {
        totalRetries++
        errors.push({name: step.name || '', message: attempt.error.message, stack: attempt.error.stack} as WrappedError)
        process.send!({type: 'ATTEMPT', attempt: attempt.attempt, next: attempt.nextMs, error: attempt.error})
      },
    })

    log(
      `${step.name} - step completed ${result.error ? 'with errors' : 'successfully'} in ${totalRetries} attempts ${
        result.error ? `error: ${result.error.message}` : ''
      }`,
      result.error ? 'error' : 'success',
    )

    const formattedResult = {
      name: step.name || '',
      description: step.description || '',
      state: result.error ? PipelineState.Failed : PipelineState.Completed,
      attempt: totalRetries,
      input: data ?? null,
      output: result.data ?? null,
      error: errors[0] ?? null,
      errors,
      duration: new Date().getTime() - new Date(startedAt).getTime(),
      startedAt,
      endedAt: new Date().toISOString(),
    }

    process.send!({type: 'RESULT', result: formattedResult})
  } catch (error) {
    process.send!({type: 'ERROR', error: (error as Error).message})
  }
})
