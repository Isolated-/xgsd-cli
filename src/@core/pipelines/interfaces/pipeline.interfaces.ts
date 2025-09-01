import {IRunnable} from '../../@shared/interfaces/runnable.interface'
import {RunFn} from '../../@shared/types/runnable.types'
import {PipelineConfig, SourceData} from '../../@types/pipeline.types'

export interface IPipeline<T extends SourceData = SourceData> {
  config: PipelineConfig<T>

  /**
   *  New input data orchestrator.
   *  @param {T | null | undefined} input
   *  @since v1
   *  @version v1
   *  @note
   *    Orchestrates the input data for the pipeline.
   *    Ensures that Pipeline isn't concerned with retry logic
   */
  orchestrate(input: T | null, ...fns: RunFn<T, T>[]): Promise<PipelineConfig<T>>
}
