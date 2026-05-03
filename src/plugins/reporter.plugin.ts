import {Block, Context, Plugin} from '@xgsd/runtime'
import {ensureDirSync, writeJsonSync} from 'fs-extra'
import {join} from 'path'

export class ReporterPlugin implements Plugin {
  events = ['project.ended']

  constructor(private readonly opts: {createReport: boolean; format: 'json' | 'jsonl'}) {}
  createReport(payload: {context: Context; output: Block[]}) {
    const {context, output} = payload
    const {config, bus, blocks, blockCount, ...ctx} = context

    const path = join(ctx.projectPath, 'runs')
    ensureDirSync(path)

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
  }

  on(event: string, payload: any): void {
    if (event === 'project.ended' && this.opts.createReport) {
      this.createReport(payload)
    }
  }
}
