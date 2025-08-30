import {createReadStream} from 'fs'
import {PipeFn, PipelineState, SourceData} from '../../@types/pipeline.types'
import {Pipeline} from '../pipeline.concrete'
import {getDefaultPipelineConfig, pipes} from '../pipelines.util'

export const testFn: PipeFn<SourceData> = async (context) => {
  return context.next(context.input)
}

export const myPipe: PipeFn<SourceData> = async (context) => {
  return context.next(context.input)
}

export const loadUserAccount: PipeFn<SourceData> = async (context) => {
  const data = {
    username: 'myusername',
    email: 'test@xgsd.io',
  }

  return context.next(data)
}

export const saveUserAccount: PipeFn<SourceData> = async (context) => {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return context.next({saved: true})
}

describe('pipeline unit tests (new abstractions)', () => {
  test('should create an instance from default config (improved flexibility vs old interface)', () => {
    const pipeline = pipes(testFn)
    expect(pipeline).toBeInstanceOf(Pipeline)
  })

  test('should create an instance from custom config (no more private constructors blocking creation)', () => {
    const pipeline = new Pipeline({
      ...getDefaultPipelineConfig(),
      steps: [
        {
          state: PipelineState.Pending,
          run: null,
          pipe: testFn,
        },
      ],
    })

    expect(pipeline).toBeInstanceOf(Pipeline)
  })

  test('should call run() and return the config object', async () => {
    const pipeline = pipes(testFn)
    const result = await pipeline.run({
      myData: true,
    })

    expect(result.output).toEqual({myData: true})
    expect(result.state).toEqual(PipelineState.Succeeded)
    expect(result.errors).toHaveLength(0)
    expect(result.steps[0].state).toEqual(PipelineState.Succeeded)
  })

  test('should call loadUser and saveUser', async () => {
    const pipeline = pipes(loadUserAccount, saveUserAccount)
    const result = await pipeline.run({
      username: 'myuser',
    })

    expect(result).toBeDefined()
    expect(result.output).toEqual({email: 'test@xgsd.io', username: 'myusername', saved: true})
  })

  test('should stop if a step fails and `stopOnError`: true', async () => {
    const failing: PipeFn<SourceData> = async (context) => {
      throw new Error('oops something went wrong')
    }

    const pipeline = pipes(loadUserAccount, failing, saveUserAccount)
    pipeline.config.stopOnError = true

    const result = await pipeline.run({
      username: 'myuser',
    })

    expect(result.runs).toHaveLength(1)
    expect(result.state).toEqual(PipelineState.Completed) // <- state is "completed" when one or more steps fail (loadUserAccount completes here)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toEqual(new Error('oops something went wrong'))
  })

  test('should continue processing if a step fails and `stopOnError`: false', () => {
    jest.useFakeTimers()
    const failing: PipeFn<SourceData> = async (context) => {
      // keep this here to clear listener
      await new Promise((resolve) =>
        setTimeout(() => {
          context.next()
        }, 50),
      )
      throw new Error('oops something went wrong')
    }

    const pipeline = pipes(loadUserAccount, failing, saveUserAccount)
    pipeline.config.stopOnError = false

    expect(
      pipeline.run({
        username: 'myuser',
      }),
    ).resolves.toEqual({
      output: {email: 'test@xgsd.io', username: 'myusername', saved: true},
      state: PipelineState.Completed, // <- state is "completed" when one or more steps fail
      steps: [
        {state: PipelineState.Succeeded, run: null, pipe: loadUserAccount},
        {state: PipelineState.Failed, run: null, pipe: failing},
        {state: PipelineState.Succeeded, run: null, pipe: saveUserAccount},
      ],
    })
  })
})
