import {PipelineStep, SourceData} from '../../@types/pipeline.types'
import {runStep} from '../process/orchestration.process'
import {BasicOrchestrator} from './basic.orchestrator'

export class IsolatedOrchestrator<T extends SourceData = SourceData> extends BasicOrchestrator<T> {
  async run(step: PipelineStep<T>): Promise<PipelineStep<T>> {
    const result = await runStep(0, step, this.context as any)

    return result.step
  }
}
