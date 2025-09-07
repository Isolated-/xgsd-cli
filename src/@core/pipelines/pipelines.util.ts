import {dirname, extname, join, resolve} from 'path'
import {RunFn} from '../@shared/types/runnable.types'
import {FlexibleWorkflowConfig, PipelineConfig, PipelineMode, PipelineState, SourceData} from '../@types/pipeline.types'
import {IPipeline} from './interfaces/pipeline.interfaces'
import {Pipeline} from './pipeline.concrete'
import {ensureDirSync, pathExistsSync, readdirSync, readFileSync, readJsonSync} from 'fs-extra'
import {load} from 'js-yaml'
import {Require} from '../@types/require.type'
import * as Joi from 'joi'
import ms = require('ms')
import {deepmerge} from '../util/object.util'

export const orchestration = async <T extends SourceData = SourceData, R extends SourceData = SourceData>(
  input: T,
  ...fns: RunFn<T, R>[]
): Promise<PipelineConfig<R>> => {
  const pipeline = new Pipeline(getDefaultPipelineConfig())
  return pipeline.orchestrate(input, ...(fns as any)) as Promise<PipelineConfig<R>>
}

export const getDefaultPipelineConfig = <T extends SourceData = SourceData>(
  opts?: Partial<PipelineConfig<T>>,
): PipelineConfig<T> => {
  return {
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
    mode: PipelineMode.Async,
    ...opts,
  }
}

/**
 *  Find the user workflow configuration file path.
 *  Attempts to match .yml, .yaml, or .json config in root
 *  Or workflows/* directory if workflow is provided
 *  @param basePath The base path to search from.
 *  @returns The path to the configuration file or null if not found.
 */
export const findUserWorkflowConfigPath = (basePath: string, workflow?: string): string | null => {
  if (!pathExistsSync(basePath)) {
    throw new Error('base path could not be found')
  }

  let extensions = ['.yml', '.yaml', '.json']
  let name = workflow ?? 'config'
  let absPath = join(basePath)

  if (workflow) {
    absPath = join(absPath, 'workflows')
  }

  for (const ext of extensions) {
    const filePath = join(absPath, `${name}${ext}`)
    if (pathExistsSync(filePath)) {
      return filePath
    }
  }

  return null
}

export const loadUserWorkflowConfig = (path: string, workflow?: string): FlexibleWorkflowConfig => {
  const configPath = findUserWorkflowConfigPath(path, workflow)
  if (!configPath) {
    let expectedPath = join(path, 'workflows', workflow || 'config')
    throw new Error("configuration path doesn't exist at " + expectedPath)
  }

  const ext = extname(configPath)

  let fileContents
  if (ext === '.json') {
    fileContents = readJsonSync(configPath)
  } else {
    let data = readFileSync(configPath)
    fileContents = load(data.toString())
  }

  return fileContents as FlexibleWorkflowConfig
}

export const validRunners = ['xgsd@v1']
export const validModes = ['chained', 'fanout', 'async']
export const validBackoffStrategies = ['manual', 'linear', 'exponential']

export const validateWorkflowConfig = (config: FlexibleWorkflowConfig): FlexibleWorkflowConfig => {
  const optionsValidators = Joi.object({
    timeout: Joi.string()
      .pattern(/^\d+ms$|^\d+s$|^\d+m$|^\d+h$|^\d+d$|^\d+w$|^\d+mo$/)
      .optional(),
    retries: Joi.number().min(0).max(100).optional(),
    concurrency: Joi.number().min(1).max(32).optional(),
    backoff: Joi.string().valid('linear', 'squaring', 'exponential').optional(),
  })

  // Perform validation logic here
  const validationSchema = Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    enabled: Joi.boolean().optional(),
    version: Joi.string().optional(),
    runner: Joi.string()
      .valid(...validRunners)
      .optional(),
    metadata: Joi.object().optional(),
    data: Joi.object().optional(),
    mode: Joi.string().valid(...validModes),
    config: Joi.object().optional(),
    options: optionsValidators,
    collect: Joi.object({
      logs: Joi.boolean().optional(),
      run: Joi.boolean().optional(),
    }).optional(),
    logs: Joi.object({
      bucket: Joi.string().allow('1h', '1d'),
      path: Joi.string(),
    }).optional(),
    print: Joi.object({
      input: Joi.boolean().optional(),
      output: Joi.boolean().optional(),
      errors: Joi.boolean().optional(),
    }).optional(),
    steps: Joi.array()
      .items(
        Joi.object({
          enabled: Joi.boolean().default(true),
          name: Joi.string().required(),
          description: Joi.string().optional(),
          data: Joi.object().optional(),
          env: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
          if: Joi.alternatives().try(Joi.boolean(), Joi.string()).optional(),
          with: Joi.object().optional(),
          after: Joi.object().optional(),
          action: Joi.string().optional(),
          options: optionsValidators,
          run: Joi.string().optional(),
        }),
      )
      .min(1)
      .max(64),
  })

  const {error, value} = validationSchema.validate(config, {abortEarly: false, allowUnknown: true, stripUnknown: true})

  if (error) {
    throw new Error(`workflow config validation error: ${error.message}`)
  }

  return getWorkflowConfigDefaults(value)
}

export const getWorkflowConfigDefaults = (config: Require<FlexibleWorkflowConfig, 'steps'>): FlexibleWorkflowConfig => {
  let header = {
    name: config.name ?? '',
    description: config.description ?? '',
    version: config.version,
    runner: config.runner ?? 'xgsd@v1',
    metadata: config.metadata ?? {},
    mode: config.mode ?? PipelineMode.Chained,
    enabled: config.enabled ?? true,
    data: config.data,
    options: {
      timeout: ms(config.options?.timeout || ('5s' as any)) || 5000,
      retries: config.options?.retries || 5,
      concurrency: config.options?.concurrency || 4,
      backoff: config.options?.backoff || 'exponential',
    },
    collect: {
      logs: config.collect?.logs ?? true,
      run: config.collect?.run ?? true,
    },
    logs: {
      bucket: config.logs?.bucket || '1h',
      path: config.logs?.path,
    },
    print: {
      input: config.print?.input ?? false,
      output: config.print?.output ?? false,
    },
  }

  const steps = config.steps.map((step) => ({
    ...step,
    name: step.name,
    description: step.description || 'no description',
    action: step.run || step.action || null,
    enabled: step.enabled ?? true,
    data: deepmerge({}, header.data, step.data, step.with),
    env: step.env || null,
    options: {
      timeout: step.options?.timeout || header.options.timeout,
      retries: step.options?.retries || header.options.retries,
      backoff: step.options?.backoff || header.options.backoff,
    },
    if: step.if ?? null,
    run: step.action || step.run || null,
  }))

  return {
    ...header,
    steps,
  } as FlexibleWorkflowConfig
}

export const getWorkflowDurations = (path: string, last: number = 8): number[] => {
  const listdir = readdirSync(path)
  const json = listdir.filter((file) => extname(file) === '.json').slice(-last)

  return json.map((file) => {
    const filePath = join(path, file)
    return readJsonSync(filePath).duration
  })
}

export const getWorkflowStats = (path: string) => {
  const runs = readdirSync(path).filter((file) => extname(file) === '.json')
  const durations = getWorkflowDurations(path, 8)

  return {
    total: runs.length,
    average: calculateAverageWorkflowDuration(durations),
  }
}

export const calculateAverageWorkflowDuration = (durations: number[]): number => {
  const total = durations.reduce((acc, duration) => acc + duration, 0)
  if (isNaN(total)) {
    return NaN
  }
  return total / durations.length
}

export const calculateAverageWorkflowTimeFromPath = (path: string, last?: number) => {
  const durations = getWorkflowDurations(path, last)
  return calculateAverageWorkflowDuration(durations) || NaN
}

export const getDurationString = (timeout: number | string): string => {
  if (typeof timeout === 'string') {
    return timeout
  }

  if (typeof timeout === 'number' && isNaN(timeout)) {
    return 'unknown'
  }

  return ms(timeout as number)
}
