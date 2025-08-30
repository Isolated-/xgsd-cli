import {Args, Command, Flags} from '@oclif/core'
import {join} from 'path'
import {runner, runnerFn, timedRunnerFn} from '../@core/@shared/runner'
import {getDefaultPipelineConfig} from '../@core/pipelines/pipelines.util'
import {readJsonSync} from 'fs-extra'
import {Pipeline} from '../@core/pipelines/pipeline.concrete'

export default class Run extends Command {
  static override args = {
    function: Args.string({
      description: 'function to run',
      required: true,
      parse: async (input) => {
        try {
          const extension = input.split('.').pop()
          if (extension !== 'js') {
            throw new Error('only .js and .ts files are supported')
          }

          const mod = require(join(process.cwd(), input))

          return mod
        } catch (error) {
          throw error
        }
      },
    }),
  }
  static override description = 'describe the command here'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    // flag with no value (-f, --force)
    force: Flags.boolean({char: 'f'}),
    // flag with a value (-n, --name=VALUE)
    name: Flags.string({char: 'n', description: 'name to print'}),
    data: Flags.string({
      char: 'd',
      description: 'data file to use (to use a path, prefix with @)',
      exists: true,
      required: false,
      parse: (input) => {
        if (input.charAt(0) === '@') {
          const data = readJsonSync(input.slice(1))
          return data
        }

        try {
          return JSON.parse(input)
        } catch (_) {
          return input
        }
      },
    }),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Run)

    if (typeof args.function === 'function') {
      const result = await timedRunnerFn(flags.data ?? {data: 'some data'}, args.function, {
        mode: 'isolated',
        retries: 3,
        timeout: 3000,
      })

      return
    }

    const pipelineConfig = args.function as any
    if (pipelineConfig.steps && pipelineConfig.steps === 0) {
      this.error('please provide one or more steps in the pipeline')
    }

    const pipeline = new Pipeline(
      getDefaultPipelineConfig({
        ...pipelineConfig,
      }),
    )

    const ctx = await pipeline.orchestrate({data: 'some input data'}, ...pipelineConfig.steps)
    console.log(ctx)
  }
}
