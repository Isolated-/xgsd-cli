import {PartialStep, PipeFn, PipelineConfig, PipelineState, PipelineStep, SourceData} from '../@types/pipeline.types'
import {IPipeline} from './interfaces/pipeline.interfaces'
import {Pipeline} from './pipeline.concrete'

export const pipes = <T extends SourceData = SourceData>(...pipeFns: PipeFn<T>[]): IPipeline<T> => {
  return new Pipeline(
    getDefaultPipelineConfig({
      steps: pipeToStep(...pipeFns),
    }),
  )
}

export const pipeToStep = <T extends SourceData = SourceData>(...pipeFns: PipeFn<T>[]): PipelineStep<T>[] => {
  return pipeFns.map((fn) => ({
    run: null,
    state: PipelineState.Pending,
    pipe: fn,
  }))
}

export const partialStepToStep = <T extends SourceData = SourceData>(steps: PartialStep<T>[]): PipelineStep<T>[] => {
  return steps.map((step) => ({
    run: null,
    state: PipelineState.Pending,
    pipe: step.pipe!,
    validate: step.validate,
    transform: step.transform,
    strip: step.strip,
  }))
}

export const stepToPipe = <T extends SourceData = SourceData>(...steps: PipelineStep<T>[]): PipeFn<T>[] => {
  return steps.map((step) => step.pipe)
}

export const getDefaultPipelineConfig = <T extends SourceData = SourceData>(
  opts?: Partial<PipelineConfig<T>>,
): PipelineConfig<T> => {
  return {
    input: null,
    output: null,
    runs: [],
    steps: [],
    errors: [],
    state: PipelineState.Pending,
    timeout: 10000,
    max: 3,
    retries: 0,
    stopOnError: false,
    ...opts,
  }
}
