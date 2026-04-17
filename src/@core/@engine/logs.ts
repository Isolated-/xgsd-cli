import {join} from 'path'
import {pathExistsSync} from 'fs-extra'
import {createLogger, transports, format, Logger} from 'winston'
import moment = require('moment')
import {ProjectContext} from './types/project.types'

export const attachProcessLogAdapter = (context: ProjectContext): ProcessLogAdapter => {
  const adapter = new ProcessLogAdapter(context)

  context.stream.on('message', (e) => adapter.log(e))
  context.stream.on('error', (e) => adapter.error(e))

  return adapter
}

export class ProcessLogAdapter {
  private readonly logger: Logger
  private readonly baseMeta: Record<string, any>

  constructor(private readonly context: ProjectContext) {
    const date = new Date()

    const bucketStr = context.config.logs?.bucket || '1d'
    const unit = bucketStr.slice(-1).toLowerCase()
    const bucket = moment(date)
      .subtract(bucketStr)
      .startOf(unit as any)

    const day = bucket.format('YYYY-MM-DD')
    const hour = bucket.format('HH:mm')

    const logPath = join(context.output, 'logs')

    const humanLog = join(logPath, `logs-${unit === 'h' ? hour : day}.log`)
    const jsonlLog = join(logPath, `logs-${day}.combined.jsonl`)

    this.logger = createLogger({
      level: 'user',
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        status: 3,
        success: 4,
        user: 5,
        debug: 6,
      },
      format: format.combine(
        format.timestamp(),
        format.printf(({level, message, timestamp, ...meta}) => {
          const extras = Object.keys(meta).length ? JSON.stringify(meta) : ''
          return `(${level}) ${message} (${timestamp}) ${extras}`
        }),
      ),
      transports: [
        new transports.File({filename: humanLog}),
        new transports.File({
          filename: jsonlLog,
          format: format.combine(format.timestamp(), format.json()),
        }),
      ],
    })

    // cache static metadata
    this.baseMeta = {
      cli: context.cli,
      config: context.hash,
      node: process.version,
      os: process.platform,
      runner: 'xgsd@v1',
      docker: pathExistsSync('/.dockerenv'),
    }
  }

  async log(msg: any): Promise<void> {
    const log = msg?.log
    if (!log) return

    this.logger.log({
      level: log.level || 'info',
      message: log.message,
      timestamp: log.timestamp,
      context: log.context,
      step: log.step,
      ...this.baseMeta,
    })
  }

  async error(msg: any): Promise<void> {
    const err = msg?.error
    const step = msg?.step
    const ctx = msg?.context || this.context

    if (!err) return

    this.logger.log({
      level: 'error',
      name: err.name,
      message: err.message,
      step: step?.name || step?.run,
      context: ctx?.id,
      ...this.baseMeta,
    })
  }
}
