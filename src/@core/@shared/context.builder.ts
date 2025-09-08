import {v4} from 'uuid'
import {FlexibleWorkflowConfig, PipelineState, PipelineStep, SourceData} from '../@types/pipeline.types'
import {EventEmitter2} from 'eventemitter2'
import {createHash} from 'crypto'
import {pathExistsSync} from 'fs-extra'
import {join} from 'path'

export class WorkflowContext<T extends SourceData = SourceData> {
  id: string
  version: string
  hash: string
  cli: string
  docker: boolean
  stream: EventEmitter2
  runner: string
  route: string
  mode: 'chained' | 'async' | 'fanout' | 'batched'
  state: PipelineState
  name: string
  description: string
  package: string
  output: string
  start: string | null
  end: string | null
  duration: number | null
  config: FlexibleWorkflowConfig<T>
  steps: PipelineStep<T>[]

  constructor(config: FlexibleWorkflowConfig<T>, event: EventEmitter2, cli?: string) {
    this.id = v4()
    this.hash = createHash('sha256').update(JSON.stringify(config)).digest('hex').slice(0, 8)
    this.name = config.name!
    this.description = config.description || ''
    this.route = `${this.name}-${this.hash}`
    this.cli = cli || 'unknown'
    this.docker = pathExistsSync('/.dockerenv')
    this.version = 'v' + config.version
    this.stream = event || new EventEmitter2()
    this.runner = config.runner
    this.mode = config.mode
    this.package = config.package!
    this.state = PipelineState.Pending
    this.start = new Date().toISOString()
    const today = this.start.split('T')[0]
    this.output = join(config.output || '', today, this.name, this.route)
    this.end = null
    this.duration = null
    this.config = config
    this.steps = []
  }

  format?() {
    return {
      id: this.id,
      version: this.version,
      name: this.name,
      description: this.description,
      package: this.package,
      output: this.output,
      mode: this.mode,
      hash: this.hash,
      runner: this.runner,
      cli: this.cli,
      node: process.version,
      platform: process.platform,
      docker: this.docker,
      state: this.state,
      start: this.start,
      end: this.end,
      duration: this.duration,
      config: this.config,
      steps: this.steps,
    }
  }

  serialise?() {
    return {
      ...this,
      serialise: undefined,
      format: undefined,
      stream: undefined,
    }
  }
}
