import {ForkOptions, fork} from 'child_process'
import {PipelineStep, PipelineState} from '../../@types/pipeline.types'
import {WorkflowEvent} from '../../workflows/workflow.events'
import {WorkflowContext} from '../context.builder'
import {WorkflowError, WorkflowErrorCode} from '../workflow.error'

export const event = (name: string, payload: object) => {
  process.send!({type: 'PARENT:EVENT', event: name, payload})
}

export const log = (
  message: string,
  level: 'info' | 'error' | 'user',
  context?: WorkflowContext,
  step?: PipelineStep,
) => {
  process.send!({type: 'PARENT:LOG', log: {level, message, timestamp: new Date().toISOString()}, context, step})
}

export class ProcessManager {
  process: any
  startedAt: number

  constructor(
    public step: PipelineStep,
    public context: WorkflowContext,
    public path: string,
    public timeoutMs?: number,
  ) {
    this.startedAt = Date.now()
  }

  fork(args: ForkOptions[] = []) {
    this.process = fork(this.path, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: {
        XGSD_WORKFLOW_ID: this.context.id,
        XGSD_WORKFLOW_HASH: this.context.hash,
        ...this.step.env,
      },
      execArgv: ['--max-old-space-size=256', '--stack-size=1024'],
    })

    const log = (message: string, level: 'info' | 'error' | 'user', context?: WorkflowContext, step?: PipelineStep) => {
      if (context?.stream) {
        context.stream.emit('message', {log: {level, message, timestamp: new Date().toISOString(), context, step}})
        return
      }

      process.send!({type: 'PARENT:LOG', log: {level, message, timestamp: new Date().toISOString()}, context, step})
    }

    this.process.stdout?.on('data', (chunk: Buffer) => {
      const msg = chunk.toString().trim()
      if (msg) log(msg, 'user', this.context, this.step)
    })

    this.process.stderr?.on('data', (chunk: Buffer) => {
      const msg = chunk.toString().trim()
      if (msg) log(msg, 'error', this.context, this.step)
    })
  }

  run(prefix: string = 'CHILD'): Promise<{step: any; fatal: boolean; errors: any[]}> {
    return new Promise((resolve) => {
      let timer: NodeJS.Timeout | null = null

      const timerHandler = () => {
        this.process.kill()
        const error = new WorkflowError('hard timeout limit reached', WorkflowErrorCode.HardTimeout)
        const updated = {
          ...this.step,
          startedAt: new Date(this.startedAt).toISOString(),
          endedAt: new Date().toISOString(),
          duration: Date.now() - this.startedAt,
          state: PipelineState.Failed,
          error,
          errors: [error],
        }

        resolve({step: updated, fatal: true, errors: []})
      }

      if (this.timeoutMs) {
        timer = setTimeout(timerHandler, this.timeoutMs)
      }

      this.process.on('message', (msg: any) => {
        switch (msg.type) {
          case `${prefix}:EVENT`:
            if (msg.event === WorkflowEvent.StepRetry) {
              if (timer) clearTimeout(timer)
              timer = setTimeout(timerHandler, this.timeoutMs! + msg.payload.attempt.nextMs + 500)
              this.context.stream.emit('event', {
                event: msg.event,
                payload: msg.payload,
              })
            }

            if (msg.event === WorkflowEvent.StepStarted) {
              if (timer) clearTimeout(timer)
              timer = setTimeout(timerHandler, this.timeoutMs! + 1000)
            }
            break

          case `${prefix}:RESULT`:
            this.process.kill()
            if (timer) clearTimeout(timer)
            resolve({step: msg.result.step, fatal: false, errors: msg.result.step.errors})
            break

          case `${prefix}:ERROR`:
            this.process.kill()
            if (timer) clearTimeout(timer)
            resolve({
              step: {...this.step, state: PipelineState.Failed},
              fatal: true,
              errors: [msg.error],
            })
            break
        }
      })

      // send start command
      this.process.send({type: 'START', step: this.step, context: this.context})
    })
  }
}
