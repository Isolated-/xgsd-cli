import {extname, join, resolve} from 'path'
import {RunFn} from '../@shared/types/runnable.types'
import {FlexiblePipelineConfig, PipelineConfig, PipelineMode, PipelineState, SourceData} from '../@types/pipeline.types'
import {IPipeline} from './interfaces/pipeline.interfaces'
import {Pipeline} from './pipeline.concrete'
import {pathExistsSync, readFileSync, readJsonSync} from 'fs-extra'
import {load} from 'js-yaml'
import {Require} from '../@types/require.type'
import * as Joi from 'joi'
import ms = require('ms')
import * as _ from 'lodash'

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

export const loadUserWorkflowConfig = (path: string, workflow?: string): FlexiblePipelineConfig => {
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

  return fileContents as FlexiblePipelineConfig
}

export const validRunners = ['xgsd@v1']
export const validModes = ['chained', 'fanout', 'async']

export const validateWorkflowConfig = (config: FlexiblePipelineConfig): FlexiblePipelineConfig => {
  const optionsValidators = Joi.object({
    timeout: Joi.string()
      .pattern(/^\d+ms$|^\d+s$|^\d+m$|^\d+h$|^\d+d$|^\d+w$|^\d+mo$/)
      .optional(),
    retries: Joi.number().min(0).max(100).optional(),
  })

  // Perform validation logic here
  const validationSchema = Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    enabled: Joi.boolean().optional(),
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
    steps: Joi.array()
      .items(
        Joi.object({
          enabled: Joi.boolean().default(true),
          name: Joi.string().required(),
          description: Joi.string().optional(),
          data: Joi.object().optional(),
          action: Joi.string().required(),
          options: optionsValidators,
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

export const getWorkflowConfigDefaults = (config: Require<FlexiblePipelineConfig, 'steps'>): FlexiblePipelineConfig => {
  let header = {
    name: config.name ?? '',
    description: config.description ?? '',
    runner: config.runner ?? 'xgsd@v1',
    metadata: config.metadata ?? {},
    mode: config.mode ?? PipelineMode.Chained,
    enabled: config.enabled || true,
    data: config.data,
    options: {
      timeout: ms(config.options?.timeout || ('5s' as any)) || 5000,
      retries: config.options?.retries || 5,
    },
    collect: {
      logs: config.collect?.logs ?? false,
      run: config.collect?.run ?? false,
    },
  }

  const steps = config.steps.map((step) => ({
    name: step.name,
    description: step.description || 'no description',
    action: step.action,
    enabled: step.enabled ?? true,
    data: header.data || step.data ? _.merge({}, header.data, step.data) : undefined,
    options: {
      timeout: step.options?.timeout || header.options.timeout,
      retries: step.options?.retries || header.options.retries,
    },
  }))

  return {
    ...header,
    steps,
  } as FlexiblePipelineConfig
}
