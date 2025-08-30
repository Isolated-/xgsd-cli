import {PipeFn, PipelineConfig, PipelineState, PipelineStep, SourceData} from '../../@types/pipeline.types'
import {Pipeline} from '../pipeline.concrete'
import {getDefaultPipelineConfig, partialStepToStep, pipes, pipeToStep, stepToPipe} from '../pipelines.util'

const testPipeFn: PipeFn<SourceData> = (context) => {
  return context.next()
}

describe('pipes() utility/generator function', () => {
  test('should generate a pipeline instance', () => {
    const pipeline = pipes(testPipeFn)
    expect(pipeline).toBeDefined()
    expect(pipeline).toBeInstanceOf(Pipeline)
  })
})

describe('pipeToStep() util function', () => {
  test('should generate an array of PipelineSteps', () => {
    const stages: PipelineStep[] = pipeToStep(testPipeFn)

    expect(stages).toHaveLength(1)
    expect(stages[0]).toHaveProperty('pipe', testPipeFn)

    // don't remove duplicate pipes
    expect(pipeToStep(testPipeFn, testPipeFn)).toHaveLength(2)
  })
})

const transformer = <R = string>(data: SourceData): Promise<R> | R => {
  // Transform the data here
  return JSON.stringify(data) as R
}

describe('partialStepToStep() util function', () => {
  test('should generate an array of PipelineSteps (allowing for configuration)', () => {
    const stages: PipelineStep<SourceData>[] = partialStepToStep([
      {
        pipe: testPipeFn,
        transform: transformer,
      },
    ])

    expect(stages).toHaveLength(1)
    expect(stages[0]).toHaveProperty('pipe', testPipeFn)
    expect(stages[0].transform).toBe(transformer)
    expect(
      typeof stages[0].transform!({
        foo: 'bar',
      }),
    ).toBe('string')
  })
})

describe('stepToPipe() util function', () => {
  test('should generate an array of PipeFns', () => {
    const pipes: PipeFn[] = stepToPipe({pipe: testPipeFn, run: null, state: PipelineState.Pending})

    expect(pipes).toHaveLength(1)
    expect(pipes[0]).toBe(testPipeFn)
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
      steps: [{pipe: testPipeFn, run: null, state: PipelineState.Failed}],
    }

    expect(getDefaultPipelineConfig(overrides)).toEqual({
      ...defaults,
      ...overrides,
    })
  })
})
