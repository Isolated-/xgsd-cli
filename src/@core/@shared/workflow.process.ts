import {PipelineState, PipelineStep, SourceData} from '../@types/pipeline.types'
import {ParentMessage} from '../pipelines/pipeline.concrete'
import {WorkflowEvent} from '../workflows/workflow.events'
import {executeSteps} from './process/orchestration.process'

export const event = (name: string, payload: object) => {
  process.send!({type: 'PARENT:EVENT', event: name, payload})
}

// stream results vs send massive array back
process.on('message', async (msg: ParentMessage<SourceData>) => {
  if (msg.type !== 'PARENT:RUN') return

  const {context, data} = msg
  const {config} = context

  event(WorkflowEvent.WorkflowStarted, {context})

  // v0.4.0 - concurrency is implemented
  // concurrency = max amount of processes at one time
  // 8 - 32 is the sweet spot for most systems (hard limit is 64)
  await executeSteps(config.steps || [], data || {}, context, {
    mode: config.mode,
    concurrency: config.options?.concurrency,
  })

  event(WorkflowEvent.WorkflowCompleted, {state: PipelineState.Completed})
  process.send!({
    type: 'PARENT:RESULT',
    result: {state: PipelineState.Completed},
  })
})
