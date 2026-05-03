import {Args, Command, Flags} from '@oclif/core'
import {BaseCommand} from '../../base'
import {join} from 'path'
import {pathExistsSync, readFileSync, rmSync} from 'fs-extra'

export function isBackgroundProcessRunning(path: string, pid?: number): number | boolean {
  function heartbeat(pid: number): number | boolean {
    if (!Number.isInteger(pid) || pid <= 0) return false

    try {
      process.kill(pid, 0)
      return pid
    } catch (err: any) {
      if (err.code === 'ESRCH') return false
      if (err.code === 'EPERM') return true
      throw err
    }
  }

  // If explicit PID provided, trust it
  if (pid !== undefined) {
    return heartbeat(pid)
  }

  // No PID file → nothing running
  if (!pathExistsSync(path)) {
    return false
  }

  const raw = readFileSync(path, 'utf8').trim()
  const resolvedPid = Number(raw)

  if (!Number.isInteger(resolvedPid)) {
    return false
  }

  return heartbeat(resolvedPid)
}

export default class Down extends Command {
  static override aliases: string[] = ['down', 'stop', 'server:stop']

  static override description = 'stops server running in the background (if exists)'
  static override examples = ['<%= config.bin %> <%= command.id %>']
  static override flags = {
    pid: Flags.integer({description: 'provide a process ID vs resolving it (useful for hanging background services)'}),
    force: Flags.boolean({char: 'f'}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse()
    const path = join(this.config.home, '.local', 'state', 'xgsd', 'xgsd.pid')

    const pid = isBackgroundProcessRunning(path, flags.pid)

    if (flags.force) {
      rmSync(path)
    }

    // false if not running
    if (!isBackgroundProcessRunning(path)) {
      this.log('no background service running\nuse `xgsd up` to start it')
      return
    }

    // or pid if is
    if (typeof pid === 'number') {
      try {
        process.kill(pid)
      } catch (error: any) {
        if (error.code === 'ESRCH') return
        throw error
      }

      this.log(`killed process ${pid}`)

      rmSync(path)
      this.log(`removed pid file from ${path}`)
    }

    this.log('successfully stopped background service')
  }
}
