import {PipelineMode, PipelineState, SourceData} from '../../@types/pipeline.types'
import {Pipeline} from '../pipeline.concrete'
import {getDefaultPipelineConfig, orchestration} from '../pipelines.util'
import {RunFn} from '../../@shared/types/runnable.types'

export const testFn: RunFn<any, any> = async ({input, state, runs, steps, errors, next}) => {
  return next(input)
}

export const newTestFn: RunFn<any, any> = async (data) => {
  return {data: data.foo.toUpperCase()}
}

describe('pipeline unit tests (new abstractions)', () => {
  test('should create an instance from default config (improved flexibility vs old interface)', () => {
    const pipeline = new Pipeline(getDefaultPipelineConfig())
    expect(pipeline).toBeInstanceOf(Pipeline)
  })

  test('should create and run from generator function (orchestration)', async () => {
    const pipelineResult = await orchestration({foo: 'bar'}, newTestFn)
    expect(pipelineResult).toBeDefined()
    expect(pipelineResult.output).toEqual({data: 'BAR'})
  })

  test('should create an instance from custom config (no more private constructors blocking creation)', () => {
    const pipeline = new Pipeline({
      ...getDefaultPipelineConfig(),
      steps: [
        {
          input: null,
          output: null,
          state: PipelineState.Pending,
          run: null,
          fn: testFn,
        },
      ],
    })

    expect(pipeline).toBeInstanceOf(Pipeline)
  })

  describe('data acceptance tests', () => {
    test('should accept string -> string', async () => {
      const testFn: RunFn<string, string> = async (data: string) => data.toUpperCase()
      const pipeline = await orchestration('plaintext', testFn)
      expect(pipeline.output).toEqual('PLAINTEXT')
    })

    test('should accept number -> string', async () => {
      const testFn: RunFn<number, string> = async (data: number) => data.toString()
      const pipeline = await orchestration(123, testFn)
      expect(pipeline.output).toEqual('123')
    })

    test('should accept boolean -> string', async () => {
      const testFn = async (data: boolean) => (data ? 'true' : 'false')
      const pipeline = await orchestration(true, testFn)
      expect(pipeline.output).toEqual('true')
    })

    test('should accept null -> string', async () => {
      const testFn = async (data: null) => (data === null ? 'null' : 'not null')
      const pipeline = await orchestration(null, testFn)
      expect(pipeline.output).toEqual('null')
    })

    test('should accept undefined -> string', async () => {
      const testFn = async (data: undefined) => (data === undefined ? 'undefined' : 'defined')
      const pipeline = await orchestration(undefined, testFn)
      expect(pipeline.output).toEqual('undefined')
    })

    test('should accept instances of classes', async () => {
      class TestClass {
        constructor(public value: string) {}
      }

      const testFn = async (data: TestClass) => data.value.toUpperCase()
      const pipeline = await orchestration(new TestClass('bar'), testFn)
      expect(pipeline.output).toEqual('BAR')
    })

    test('should accept objects', async () => {
      const testFn = async (data: {foo: string}) => {
        return {data: data.foo.toUpperCase()}
      }
      const pipeline = await orchestration({foo: 'bar'}, testFn)
      expect(pipeline.output).toEqual({data: 'BAR'})
    })
  })

  describe('orchestration tests', () => {
    test('should orchestrate input data through pipe functions', async () => {
      const pipeline = new Pipeline(getDefaultPipelineConfig())

      const result = await pipeline.orchestrate({foo: 'bar'}, newTestFn)
      expect(result.output).toEqual({data: 'BAR'})
    })

    test('should handle errors thrown by pipe functions', async () => {
      const pipeline = new Pipeline(getDefaultPipelineConfig({max: 1}))

      const result = await pipeline.orchestrate({foo: 'bar'}, async () => {
        throw new Error('Test error')
      })

      expect(result.errors).toHaveLength(2)
      expect(result.errors[0]).toEqual(new Error('Test error'))
      expect(result.errors[1]).toEqual(new Error('Max retries exceeded'))
    })

    test('should mutate and return the correct state', async () => {
      const initial = getDefaultPipelineConfig({max: 1})
      const pipeline = new Pipeline(initial)

      const result = await pipeline.orchestrate({foo: 'bar'}, newTestFn)
      expect(initial).not.toEqual(result)
    })

    test('should only make a single attempt when stopOnError = true', async () => {
      const pipeline = new Pipeline(getDefaultPipelineConfig({stopOnError: true, max: 10}))
      const result = await pipeline.orchestrate({foo: 'bar'}, async () => {
        throw new Error('Test error')
      })

      expect(result.stopOnError).toBeTruthy()
      expect(result.errors).toHaveLength(2)
      expect(result.errors[0]).toEqual(new Error('Test error'))
      expect(result.errors[1]).toEqual(new Error('Max retries exceeded'))
      expect(result.retries).toEqual(1)
    })

    test('should set step to failed', async () => {
      const pipeline = new Pipeline(getDefaultPipelineConfig({max: 1}))
      const result = await pipeline.orchestrate({foo: 'bar'}, async () => {
        throw new Error('Test error')
      })

      expect(result).toBeDefined()
      expect(result.errors[0]).toEqual(new Error('Test error'))
      expect(result.steps[0].errorMessage?.toLowerCase()).toEqual('test error')
    })

    test('should update step input/output correctly', async () => {
      const pipeline = new Pipeline(getDefaultPipelineConfig({max: 1}))
      const result = await pipeline.orchestrate({foo: 'bar'}, async (context: any) => {
        return {data: context.foo.toUpperCase()}
      })

      expect(result).toBeDefined()
      expect(result.input).toEqual({foo: 'bar'})
      expect(result.steps[0].input).toEqual({foo: 'bar'})
      expect(result.steps[0].output).toEqual({data: 'BAR'})
      expect(result.output).toEqual({data: 'BAR'})
    })

    test('input should be null when orchestrating with no input', async () => {
      const pipeline = new Pipeline(getDefaultPipelineConfig({max: 1}))
      const result = await pipeline.orchestrate(null, async (context: any) => {
        return {data: context.foo.toUpperCase()}
      })

      expect(result).toBeDefined()
      expect(result.input).toBeNull()
      expect(result.steps[0].input).toBeNull()
    })

    test('should chain output -> input of next step when orchestrating', async () => {
      const testFn = async (context: any) => {
        return {
          data: context.data.toUpperCase(),
          added: true,
        }
      }

      const testFn2 = async (context: any) => {
        return {data: context.data.toLowerCase()}
      }

      const testFn3 = async (context: any) => {
        return {data: context.data + '!!!'}
      }

      const pipeline = new Pipeline(getDefaultPipelineConfig({mode: PipelineMode.Chained}))
      const result = await pipeline.orchestrate({data: 'bar'}, testFn, testFn2, testFn3)
      expect(result).toBeDefined()
      expect(result.runs).toHaveLength(3)
      expect(result.steps[1].input).toEqual(result.steps[0].output)
      expect(result.steps[2].input).toEqual(result.steps[1].output)
      expect(result.output).toEqual({data: 'bar!!!'})
    })

    test('should handle empty pipelines gracefully', async () => {
      const pipeline = new Pipeline(getDefaultPipelineConfig())
      const result = await pipeline.orchestrate({foo: 'bar'})
      expect(result.state).toBe(PipelineState.Completed)
      expect(result.output).toBeNull() // or {foo: 'bar'} depending on your design
      expect(result.steps).toHaveLength(0)
    })

    test('async mode should preserve step indexes regardless of execution timing', async () => {
      const slowFn = async () => new Promise((res) => setTimeout(() => res({data: 'slow'}), 50)) as Promise<SourceData>
      const fastFn = async () => ({data: 'fast'})

      const pipeline = new Pipeline(getDefaultPipelineConfig({mode: PipelineMode.Async}))
      const result = await pipeline.orchestrate({foo: 'bar'}, slowFn, fastFn)

      expect(result.steps[0].run).toEqual({data: 'slow'})
      expect(result.steps[1].run).toEqual({data: 'fast'})
    })

    test('should accumulate retries across steps', async () => {
      let count = 0
      const flakyFn = async () => {
        count++
        if (count < 2) throw new Error('flaky')
        return {ok: true}
      }

      const pipeline = new Pipeline(getDefaultPipelineConfig({max: 2}))
      const result = await pipeline.orchestrate({foo: 'bar'}, flakyFn, flakyFn)

      expect(result.retries).toBeGreaterThan(1)
    })

    test('should timeout a long-running function', async () => {
      const timeoutFn = async () =>
        new Promise((res) => setTimeout(() => res({late: true}), 200)) as Promise<SourceData>
      const pipeline = new Pipeline(getDefaultPipelineConfig({timeout: 50}))
      const result = (await pipeline.orchestrate({foo: 'bar'}, timeoutFn)) as any

      expect(result.steps[0].state).toBe(PipelineState.Failed)
      expect(result.errors[0].message.toLowerCase()).toContain('timeout')
    })

    test('fanout should overwrite duplicate keys with last step result', async () => {
      const fn1 = async () => ({key: 'first'})
      const fn2 = async () => ({key: 'second'})
      const pipeline = new Pipeline(getDefaultPipelineConfig({mode: PipelineMode.Fanout}))
      const result = await pipeline.orchestrate({foo: 'bar'}, fn1, fn2)

      expect(result.output).toEqual({key: 'second'}) // confirm "last wins" logic
    })

    test('should fan input out to all steps', async () => {
      const pipeline = new Pipeline(getDefaultPipelineConfig({mode: PipelineMode.Fanout}))
      const result = await pipeline.orchestrate({foo: 'bar'}, newTestFn, newTestFn, newTestFn)

      expect(result).toBeDefined()
      expect(result.runs).toHaveLength(3)
      expect(result.steps[0].input).toEqual({foo: 'bar'})
      expect(result.steps[1].input).toEqual({foo: 'bar'})
      expect(result.steps[2].input).toEqual({foo: 'bar'})
      expect(result.output).toEqual({data: 'BAR'})
    })
  })
})
