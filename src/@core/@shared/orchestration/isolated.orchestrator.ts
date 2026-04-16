import {PipelineStep, SourceData} from '../../@types/pipeline.types'
import {BlockEvent} from '../../runner/runner.lifecycle'
import {runStep} from '../process/orchestration.process'
import {BasicOrchestrator} from './basic.orchestrator'

export class IsolatedOrchestrator<T extends SourceData = SourceData> extends BasicOrchestrator<T> {
  async run(step: PipelineStep<T>): Promise<PipelineStep<T>> {
    const result = await runStep(0, step, this.context as any)

    this.event(BlockEvent.Ended, {step: result.step, context: this.context})

    return result.step
  }
}
