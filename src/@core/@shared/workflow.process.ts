import {FlexibleWorkflowConfig, PipelineState, PipelineStep, SourceData} from '../@types/pipeline.types'
import {ParentMessage} from '../pipelines/pipeline.concrete'
import * as ms from 'ms'
import {resolveStepData, resolveStepTemplates} from './runner.process'
import {fork, ForkOptions} from 'child_process'
import {WorkflowContext} from './context.builder'
import {join} from 'path'
import {WorkflowEvent} from '../workflows/workflow.events'
import {deepmerge, deepmerge2} from '../util/object.util'
import prettyBytes from 'pretty-bytes'
import {createLogger} from 'winston'
import {runWithConcurrency} from './process/concurrency.process'
import {executeSteps} from './process/orchestration.process'

const log = (
  message: string,
  level: 'info' | 'status' | 'retry' | 'success' | 'warn' | 'error' | 'user' = 'info',
  context: WorkflowContext,
  step: PipelineStep,
) => {
  process.send!({
    type: 'PARENT:LOG',
    log: {context: context.id, step: step.name || step.run, level, message, timestamp: new Date().toISOString()},
  })
}

export const event = (name: string, payload: object) => {
  process.send!({type: 'PARENT:EVENT', event: name, payload})
}

// stream results vs send massive array back
process.on('message', async (msg: ParentMessage<SourceData>) => {
  if (msg.type !== 'PARENT:RUN') return

  const {context, data} = msg
  const {config} = context

  context.start = new Date().toISOString()
  context.state = PipelineState.Running
  event(WorkflowEvent.WorkflowStarted, {context})

  let results: PipelineStep[] = []

  // v0.3.6 - concurrency is implemented
  // concurrency = max amount of processes at one time
  // 8 - 32 is the sweet spot for most systems (hard limit is 64)
  results = await executeSteps(config.steps || [], data || {}, context, {
    mode: config.mode,
    concurrency: config.options?.concurrency,
  })

  const length = Buffer.from(JSON.stringify(results)).length // ensure serialization
  console.log(`workflow completed, total steps: ${results.length}, data size: ${prettyBytes(length)}`)

  event(WorkflowEvent.WorkflowCompleted, {steps: results})
  process.send!({
    type: 'PARENT:RESULT',
    result: {
      config,
      steps: results,
    },
  })
})
