import {Args, Command, Flags} from '@oclif/core'
import Joi = require('joi')
import {PipelineMode} from '../@core/@types/pipeline.types'

export default class Validate extends Command {
  static override args = {}
  static override description = 'describe the command here'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    // flag with no value (-f, --force)
    force: Flags.boolean({char: 'f'}),
    yml: Flags.file({char: 'y', description: 'YAML file to validate'}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Validate)

    const validationSchema = Joi.object({
      name: Joi.string().required(),
      version: Joi.string().optional(),
      runtime: Joi.string().equal('xgsd@v1').required(), // <- explicit
      mode: Joi.string().valid('async', 'fanout', 'chained').default(PipelineMode.Async).required(),
      metadata: Joi.object().optional().default({}),
      flags: Joi.object().optional().default({}),
      steps: Joi.array()
        .items(
          Joi.object({
            name: Joi.string().required(),
            action: Joi.string().required(),
            config: Joi.object()
              .default({
                timeout: 10000,
                retries: 10,
              })
              .optional(),
            secrets: Joi.object().default(null).required(),
            retry: Joi.boolean().default(true).optional(),
            maxRetries: Joi.number().default(3).min(0).optional(),
            timeout: Joi.number().default(10000).min(0).optional(),
          }),
        )
        .required(),
    })
  }
}
