import {RunFn} from '../../@shared/types/runnable.types'
import {
  PipeFn,
  PipelineConfig,
  PipelineMode,
  PipelineState,
  PipelineStep,
  SourceData,
} from '../../@types/pipeline.types'
import {Pipeline} from '../pipeline.concrete'
import {getDefaultPipelineConfig, orchestration} from '../pipelines.util'

export const testFn: RunFn<any, any> = async (data) => {
  return data
}

describe('orchestration() util function', () => {
  test('should orchestrate input data through pipe functions (without needing to manage Pipeline or Pipeline.orchestrate()', async () => {
    const result = await orchestration({foo: 'bar'}, testFn)
    expect(result.output).toEqual({foo: 'bar'})
  })
})

describe('getDefaultPipelineConfig() util function', () => {
  const defaults = {
    input: null,
    output: null,
    runs: [],
    steps: [],
    errors: [],
    state: PipelineState.Pending,
    mode: PipelineMode.Async,
    timeout: 10000,
    max: 3,
    retries: 0,
    stopOnError: false,
  }

  test('should generate config with reasonable defaults', () => {
    expect(getDefaultPipelineConfig()).toEqual(defaults)
  })

  test('should generate config with overrides', () => {
    const overrides = {
      input: {
        data: 'this is some string data',
      },
      steps: [{input: null, output: null, fn: testFn, run: null, state: PipelineState.Failed}],
    }

    expect(getDefaultPipelineConfig(overrides)).toEqual({
      ...defaults,
      ...overrides,
    })
  })
})
