import {pathExistsSync} from 'fs-extra'
import * as path from 'path'
import * as Joi from 'joi'

export function resolvePackageJson(input: string): string {
  try {
    return require.resolve(`${input}/package.json`, {
      paths: [process.cwd()],
    })
  } catch {
    try {
      const entry = require.resolve(input, {
        paths: [process.cwd()],
      })

      let dir = path.dirname(entry)

      while (dir !== path.dirname(dir)) {
        const candidate = path.join(dir, 'package.json')
        if (pathExistsSync(candidate)) return candidate
        dir = path.dirname(dir)
      }

      throw new Error(`package.json not found for ${input}`)
    } catch (err: any) {
      throw new Error(`Cannot resolve package.json for "${input}"`)
    }
  }
}

export function createValidationSchema(): Joi.Schema {
  const options = Joi.object({
    backoff: Joi.string().valid('linear', 'exponential', 'squaring').default('exponential'),
    retries: Joi.number().greater(0).default(3),
    timeout: Joi.alt(Joi.number().greater(0), Joi.string()).default(5000),
  }).default({
    backoff: 'exponential',
    retries: 3,
    timeout: 5000,
  })

  const metrics = Joi.object({
    enabled: Joi.boolean(),
    //url: Joi.string().uri(),
    //urls: Joi.array().items(Joi.string().uri()),
    accept: Joi.array().items(Joi.string().valid('basic')),
  })

  const block = Joi.object({
    run: Joi.string().required(),
    name: Joi.string(),
    description: Joi.string(),
    version: Joi.alt(Joi.string(), Joi.number()),
    input: Joi.object(),
    env: Joi.object(),
    options,
    metadata: Joi.object(),
    instances: Joi.number().min(1).max(100).default(1),
  })

  const schema = Joi.object({
    name: Joi.string(),
    description: Joi.string(),
    version: Joi.alt(Joi.string(), Joi.number()),
    entry: Joi.string(),
    mode: Joi.string().valid('async', 'chain'),
    metadata: Joi.object(),
    metrics,
    options,
    env: Joi.object(),
    data: Joi.object(),
    concurrency: Joi.number().greater(0).less(32),
    blocks: Joi.array().items(block),
  })

  return schema
}
