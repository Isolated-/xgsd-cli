import EventEmitter2 from 'eventemitter2'
import {ensureDirSync} from 'fs-extra'
import {WorkflowContext} from '../@shared/context.builder'
import {BasicOrchestrator} from '../@shared/orchestration/basic.orchestrator'
import {IsolatedOrchestrator} from '../@shared/orchestration/isolated.orchestrator'
import {SourceData, FlexibleWorkflowConfig} from '../@types/pipeline.types'
import {captureRunnerEvents} from './runner.lifecycle'
import {userCodeLogCollector} from './runner.log-collector'

export const userCodeOrchestrationv2 = async <T extends SourceData = SourceData>(
  data: any,
  config: FlexibleWorkflowConfig<T>,
  event?: EventEmitter2,
  lite: boolean = false,
) => {
  const handler = event ?? new EventEmitter2()
  const {collect} = config

  const ctx = new WorkflowContext(config, handler, 'v1')
  const orchestrator = lite ? new BasicOrchestrator<T>(ctx) : new IsolatedOrchestrator<T>(ctx)

  if (collect) {
    ensureDirSync(config.output)
  }

  if (collect?.logs) {
    userCodeLogCollector(ctx, config.output, ctx.stream)
  }

  captureRunnerEvents(ctx)

  await orchestrator.orchestrate()
}
