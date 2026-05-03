import {Plugin} from '@xgsd/runtime'
import {sizeOf} from './debug.plugin'
import {appendFileSync, ensureDirSync} from 'fs-extra'
import {join} from 'path'

// leaving this here to be fully explict
export interface ProjectExecutionMetric {
  kind: 'execution'
  activation: 'cli' | 'http'
  mode: 'async' | 'chain'
  concurrency: number
  blockCount: number
  blockFailureRate: number
  state: string
  runtime: string
  duration: number
  payloadSize: number
}

export type ExportReason = 'metrics_opt_in'

const reasonToExplanation: Record<ExportReason, string> = {
  metrics_opt_in: 'use --no-metrics or set metrics.enabled = false in project config to disable this',
}

type AnyFn<T = any, R = any> = (data: T) => Promise<R> | R

export async function writeCopyAndSend<T extends Record<string, unknown>, R>({
  data,
  fn,
  projectPath,
  reason,
}: {
  data: T
  fn: AnyFn<T, R>
  projectPath: string
  name?: string
  reason: ExportReason
}): Promise<R> {
  const exportDir = join(projectPath, 'exports')

  ensureDirSync(exportDir)

  const record = {
    data,
    reason,
    explanation: reasonToExplanation[reason],
    timestamp: new Date().toISOString(),
  }

  const fileName = 'exports.jsonl'
  appendFileSync(join(exportDir, fileName), JSON.stringify(record) + '\r\n')

  return fn(data)
}

export class MetricsPlugin implements Plugin {
  events = ['project.ended', 'block.ended']
  private blocks = {total: 0, failed: 0}
  private url: string

  constructor(private readonly opts: {metrics: boolean}) {
    const packageJson = require('../../package.json')
    this.url = packageJson.backend
  }

  async on(event: string, payload: any): Promise<void> {
    if (!this.opts.metrics) return

    const dispatchMetrics = async (data: any) => {
      await fetch(this.url, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    }

    if (event === 'block.ended') {
      this.blocks.total = this.blocks.total + 1

      if (payload.block.state === 'failed') {
        this.blocks.failed = this.blocks.failed + 1
      }

      return
    }

    const kind = 'execution'
    const {mode, concurrency, activation, start, end, environment, blockCount, projectPath, state} = payload.context
    const {runtime} = environment
    const payloadSize = sizeOf(payload)
    const duration = Date.parse(end) - Date.parse(start) // <- not ideal but works for now

    const blockFailureRate = this.blocks.total === 0 ? 0 : this.blocks.failed / this.blocks.total

    const metrics: ProjectExecutionMetric = {
      kind,
      mode,
      activation,
      concurrency,
      state,
      duration,
      payloadSize,
      runtime,
      blockCount,
      blockFailureRate,
    }

    try {
      await writeCopyAndSend({
        data: metrics,
        fn: dispatchMetrics,
        reason: 'metrics_opt_in',
        projectPath,
      })
    } catch (error) {}
  }
}
