import {join} from 'path'
import {RunFn} from '../../@shared/types/runnable.types'
import {FlexiblePipelineConfig, PipelineMode, PipelineState} from '../../@types/pipeline.types'
import {Require} from '../../@types/require.type'
import {Pipeline} from '../pipeline.concrete'
import {
  findUserWorkflowConfigPath,
  getDefaultPipelineConfig,
  getWorkflowConfigDefaults,
  loadUserWorkflowConfig,
  orchestration,
  validateWorkflowConfig,
} from '../pipelines.util'

export const testFn: RunFn<any, any> = async (data) => {
  return data
}

const validMinimalConfig = {
  steps: [
    {
      name: 'My First Step',
      action: 'myAction',
    },
  ],
}

const validWorkflowConfig = {
  name: 'My Workflow',
  description: 'My First Workflow',
  runner: 'xgsd@v1',
  enabled: false,
  options: {
    timeout: '5s',
    retries: 3,
  },
  metadata: {
    production: true,
  },
  collect: {
    logs: true,
    run: true,
  },
  steps: [
    {
      name: 'My First Step',
      action: 'myAction',
      options: {
        timeout: '5s',
      },
    },
    {
      name: 'My Second Step',
      action: 'myAction',
    },
  ],
}

describe('getWorkflowConfigDefaults', () => {
  test('should get user workflow config from file (.yml) (v0.3+)', () => {
    const config = getWorkflowConfigDefaults({
      ...validMinimalConfig,
    } as any)
    expect(config.options.timeout).toEqual(5000)
    expect(config.options.retries).toEqual(5)
  })
})

describe('loadUserWorkflowConfig', () => {
  test('should load user workflow config from file (.yml) (v0.3+)', () => {
    const config = loadUserWorkflowConfig(__dirname, 'default')
    expect(config.name).toEqual('My Workflow')
  })

  test('should load user workflow config (.yml) (< v0.3)', () => {
    const config = loadUserWorkflowConfig(join(__dirname, 'yml'))
    expect(config.name).toEqual('My Workflow')
  })

  test('should load user workflow config (.json) (< v0.3)', () => {
    const config = loadUserWorkflowConfig(join(__dirname, 'json'))
    expect(config.name).toEqual('My First Workflow')
  })

  test("should throw error when path doesn't exist", () => {
    expect(() => loadUserWorkflowConfig(join(__dirname, 'yml'), 'nonexistent')).toThrow()
  })
})

describe('findUserWorkflowConfigPath', () => {
  test('should return null when no config is found', () => {
    const foundPath = findUserWorkflowConfigPath(process.cwd())
    expect(foundPath).toBeNull()
  })

  test('should return the path to yml', () => {
    const foundPath = findUserWorkflowConfigPath(join(__dirname, 'yml'))
    expect(foundPath).not.toBeNull()
    expect(foundPath?.endsWith('.yml')).toBeTruthy()
  })

  test('should return the path to yaml', () => {
    const foundPath = findUserWorkflowConfigPath(join(__dirname, 'yaml'))
    expect(foundPath).not.toBeNull()
    expect(foundPath?.endsWith('.yaml')).toBeTruthy()
  })

  test('should return the path to json', () => {
    const foundPath = findUserWorkflowConfigPath(join(__dirname, 'json'))
    expect(foundPath).not.toBeNull()
    expect(foundPath?.endsWith('.json')).toBeTruthy()
  })

  test('should resolve workflow path correctly (for v0.3.0)', () => {
    const foundPath = findUserWorkflowConfigPath(__dirname, 'default')
    expect(foundPath).not.toBeNull()
    expect(foundPath?.endsWith('.yaml')).toBeTruthy()
  })

  test("should throw error when path doesn't exist", () => {
    expect(() => findUserWorkflowConfigPath(join(__dirname, 'nonexistent'))).toThrow()
  })
})

describe('validateWorkflowConfig', () => {
  test('should validate user workflow config', () => {
    expect(() => validateWorkflowConfig(validMinimalConfig as FlexiblePipelineConfig)).not.toThrow()
    expect(() => validateWorkflowConfig(validWorkflowConfig as any)).not.toThrow()
  })

  test('should return reasonable defaults', () => {
    const result = validateWorkflowConfig(validMinimalConfig as FlexiblePipelineConfig)
    expect(result).toEqual(getWorkflowConfigDefaults(validMinimalConfig as Require<FlexiblePipelineConfig, 'steps'>))
  })

  test('should use `workflow.options` when `workflow.steps[i].options` are empty', () => {
    const result = validateWorkflowConfig(validWorkflowConfig as any)
    expect(result.steps[1].options).toEqual({
      timeout: 5000,
      retries: 3,
    })
  })

  test('should throw an error when invalid input is provided', () => {
    expect(() => validateWorkflowConfig({} as FlexiblePipelineConfig)).toThrow()
    expect(() => validateWorkflowConfig({steps: []} as any)).toThrow()
    expect(() => validateWorkflowConfig({steps: [{}]} as any)).toThrow()
    expect(() => validateWorkflowConfig({steps: [{name: 'My Step', action: 'myAction'}]} as any)).not.toThrow()

    // undefineds, nulls, etc
    expect(() => validateWorkflowConfig(null as any)).toThrow()
    expect(() => validateWorkflowConfig(undefined as any)).toThrow()
    expect(() => validateWorkflowConfig({steps: [{name: 'My Step', action: null}]} as any)).toThrow()
    expect(() => validateWorkflowConfig({steps: [{name: null, action: 'myAction'}]} as any)).toThrow()
    expect(() =>
      validateWorkflowConfig({
        ...validMinimalConfig,
        runner: 'invalidRunner',
      } as any),
    ).toThrow()
    expect(() =>
      validateWorkflowConfig({
        ...validMinimalConfig,
        mode: 'invalidMode',
      } as any),
    ).toThrow()
    expect(() =>
      validateWorkflowConfig({
        ...validMinimalConfig,
        steps: [{name: 'My Step', action: 'myAction', options: {timeout: '5s'}}],
      } as any),
    ).not.toThrow()
  })
})

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
