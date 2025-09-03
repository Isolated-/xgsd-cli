import {v4} from 'uuid'
import {FlexibleWorkflowConfig, PipelineState, PipelineStep, SourceData} from '../@types/pipeline.types'
import {EventEmitter2} from 'eventemitter2'

export class WorkflowContext<T extends SourceData = SourceData> {
  id: string
  stream: EventEmitter2
  runner: string
  mode: 'chained' | 'async' | 'fanout'
  state: PipelineState
  name: string
  description: string
  package: string
  output: Record<string, T>
  start: string | null
  end: string | null
  duration: number | null
  config: FlexibleWorkflowConfig<T>
  steps: PipelineStep<T>[]

  constructor(config: FlexibleWorkflowConfig<T>, event: EventEmitter2) {
    this.id = v4()
    this.stream = event || new EventEmitter2()
    this.runner = config.runner
    this.name = config.name || config.package?.split('/').pop()!
    this.mode = config.mode
    this.description = config.description || ''
    this.package = config.package!
    this.state = PipelineState.Pending
    this.output = {}
    this.start = null
    this.end = null
    this.duration = null
    this.config = config
    this.steps = config.steps
  }
}
