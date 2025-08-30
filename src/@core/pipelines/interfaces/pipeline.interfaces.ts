import {PipelineConfig, SourceData} from '../../@types/pipeline.types'

export interface IPipeline<T extends SourceData = SourceData> {
  config: PipelineConfig<T>

  /**
   *  Runs the pipeline with the given input.
   *  @param {T | null | undefined} input
   *  @returns updated PipelineConfig<T> with aggregated output (.config.output)
   *  @since v1
   *  @version v1
   *  @note probably will change to return a run result instead of configuration object.
   */
  run(input?: T | null): Promise<PipelineConfig<T>>
}
