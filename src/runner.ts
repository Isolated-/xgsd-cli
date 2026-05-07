import {Context} from '@xgsd/runtime'
import {fork} from 'node:child_process'
import path, {join} from 'node:path'

export type ProjectRunMode = 'in-process' | 'process'

export interface ProjectRunnerOpts {
  mode?: ProjectRunMode
  projectPath: string
  entry?: string // path to bootstrap entry
  context?: any
}

export class ProjectRunner {
  constructor(private opts: ProjectRunnerOpts) {}

  async run(): Promise<Context> {
    const mode = this.opts.mode ?? 'process'

    return this.runInChildProcess() as any
  }
  /*
  private async runInProcess() {
    const {bootstrap} = await import(this.resolveEntry())

    return bootstrap({
      projectPath: this.opts.projectPath,
      ctx: this.opts.context,
    })
  }
    */

  private runInChildProcess() {
    const entry = join(__dirname, 'process.js')

    return new Promise((resolve, reject) => {
      const child = fork(entry, [], {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        env: {
          ...process.env,
          XGSD_PROJECT_PATH: this.opts.projectPath,
        },
      })

      child.on('message', (msg: any) => {
        if (msg?.type === 'XGSD_DONE') {
          resolve(msg.result)

          child.kill()
        }
      })

      child.on('error', reject)

      child.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Project exited with code ${code}`))
        }
      })
    })
  }

  private resolveEntry() {
    return this.opts.entry ?? path.resolve(this.opts.projectPath, 'node_modules/@xgsd/runtime/dist/index.js')
  }
}
