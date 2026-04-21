import chalk from 'chalk'

import ms = require('ms')
import {Context} from '../config'
import {Logger} from '../types/interfaces/logger.interface'
import {SystemEvent} from '../types/events.types'

type LogLevels = 'info' | 'warn' | 'error' | 'debug'

export class DebugLogger implements Logger {
  constructor(
    _: Context,
    private options?: {
      levels: LogLevels[]
    },
  ) {
    this.options = this.options ?? {
      levels: ['error', 'warn', 'info', 'debug'],
    }
  }
  log(e: {event: string; payload: any}): void {
    if (e.event === SystemEvent.SystemMessage) {
      const {level, message} = e.payload

      if (!this.options!.levels.includes(level)) {
        return
      }

      if (level === 'error') {
        console.error(chalk.red(message))
        return
      }

      if (level === 'warn') {
        console.warn(chalk.yellow(message))
        return
      }

      console.log(chalk.bold(message))
    }
  }
}
