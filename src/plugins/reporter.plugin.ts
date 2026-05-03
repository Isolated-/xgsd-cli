import {Block, Context, Plugin} from '@xgsd/runtime'
import {appendFileSync, ensureDirSync, writeJsonSync} from 'fs-extra'
import {dirname, join} from 'path'

export class ReporterPlugin implements Plugin {
  events = ['project.ended']

  constructor(private readonly opts: {createReport: boolean; format: 'json' | 'jsonl'}) {}
  createReport(payload: {context: Context; output: Block[]}) {
    const {context, output} = payload
    const {config, bus, blocks, blockCount, ...ctx} = context

    const path = join(ctx.projectPath, 'runs')
    ensureDirSync(path)

    if (this.opts.format === 'json') {
      writeJsonSync(
        join(path, `${ctx.end}.json`),
        {
          ...ctx,
          results: output.map((o) => {
            const {attempt, ...rest} = o

            return {
              ...rest,
              attempts: attempt!,
            }
          }),
        },
        {spaces: 2},
      )

      return
    }

    if (this.opts.format === 'jsonl') {
      const reduced = output.map((o) => ({
        id: o.idx,
        run: o.run,
        attempt: o.attempt,
        state: o.state,
        error: o.error ? o.error.message : null,
        duration: o.duration,
      }))

      const line = {
        id: ctx.id,
        mode: ctx.mode,
        concurrency: ctx.concurrency,
        start: ctx.start,
        end: ctx.end,
        state: ctx.state,
        output: reduced,
      }

      // TODO: bucket these by day
      const jsonlPath = join(path, 'combined.jsonl')
      appendFileSync(jsonlPath, JSON.stringify(line) + '\r\n')
    }
  }

  on(event: string, payload: any): void {
    if (event === 'project.ended' && this.opts.createReport) {
      this.createReport(payload)
    }
  }
}
