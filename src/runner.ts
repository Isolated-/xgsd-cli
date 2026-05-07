import {Activation, Context, createConfig, ProjectConfig} from '@xgsd/runtime'
import {fork} from 'node:child_process'
import path, {join, resolve} from 'node:path'
import {createValidationSchema} from './util'
import {configFile, BundlerConfig, RuntimeConfig} from './config'
import {createBundle, initialiseBootstrap} from './shared'

export type ProjectRunMode = 'in-process' | 'process'

export interface ProjectRunnerOpts {
  mode?: ProjectRunMode
  activation?: Activation
  projectPath: string
  entry?: string // path to bootstrap entry
  context?: any
  flags?: Record<string, any>
}

export class ProjectRunner {
  constructor(private opts: ProjectRunnerOpts) {}

  async run(): Promise<Context> {
    const flags = this.opts.flags ?? {}
    const mode = this.opts.mode ?? 'in-process'

    const validator = (input: any) => {
      const validation = createValidationSchema().validate(input)

      if (validation.error) {
        throw validation.error
      }

      return validation.value
    }

    // clean this mess up
    const cli = configFile(this.opts.projectPath)

    const bundler = cli.get<BundlerConfig>('bundler', {
      enabled: flags.bundle ?? false,
      cache: {
        strategy: flags.cache ? 'change' : 'never',
      },
    })

    const runtime = cli.get<RuntimeConfig>('runtime', {
      debug: flags.debug,
      save: flags.save,
      process: {enabled: flags.local === true ? false : true},
    })

    const config = createConfig({
      configPath: this.opts.flags?.config
        ? resolve(this.opts.flags?.config)
        : join(this.opts.projectPath, 'config.yaml'),
      packageJsonPath: join(this.opts.projectPath, 'package.json'),
      validator,
    })

    // preserve support for config.metrics in addition to xgsd.metrics
    const metrics = cli.get<{enabled: boolean}>('metrics', {enabled: config.metrics?.enabled ?? flags.metrics ?? false})

    if (bundler?.enabled) {
      config.entry = !flags.bundle
        ? config.entry
        : await createBundle({
            project: this.opts.projectPath,
            entry: config.entry!,
            cache: !flags.cache ? false : bundler.cache?.strategy !== 'never' ? true : false,
            log: true,
          })
    }

    const processOpts = {
      metrics,
      runtime,
      config,
    }

    if (mode === 'in-process') {
      return this.runInProcess(processOpts)
    }

    return this.runInChildProcess(processOpts) as any
  }

  private async runInProcess(opts: any) {
    return initialiseBootstrap(this.opts.projectPath, opts, this.opts.activation)
  }

  private runInChildProcess(opts: any) {
    const entry = join(__dirname, 'process.js')

    return new Promise((resolve, reject) => {
      const child = fork(entry, [], {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        env: {
          ...process.env,
          XGSD_PROJECT_PATH: this.opts.projectPath,
          XGSD_PROCESS_CONFIG: JSON.stringify(opts),
          XGSD_SPAN_START: String(this.opts.context?.spanStart ?? performance.now()),
          XGSD_ACTIVATION: this.opts.activation ?? 'cli',
        },
      })

      child.on('message', (msg: any) => {
        if (msg?.type === 'XGSD_DONE') {
          resolve(msg.result)

          child.kill()
        }
      })

      child.on('error', reject)

      child.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Project exited with code ${code}`))
        }
      })
    })
  }
}
