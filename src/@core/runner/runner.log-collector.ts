import {EventEmitter2} from 'eventemitter2'
import {join} from 'path'
import {ensureDirSync, pathExistsSync, readJsonSync, writeJsonSync} from 'fs-extra'
import {WorkflowContext} from '../@engine/context.builder'
import {createLogger, transports, format} from 'winston'
import moment = require('moment')

export const userCodeLogCollector = (context: WorkflowContext<any>, path: string, event: EventEmitter2) => {
  const date = new Date()

  const today = date.toISOString().split('T')[0]

  const bucketStr = context.config.logs?.bucket || '1d'
  const value = bucketStr.slice(0, bucketStr.length - 1)
  const unit = bucketStr.charAt(bucketStr.length - 1).toLowerCase()
  const bucket = moment(date)
    .subtract(bucketStr)
    .startOf(unit as any)

  const day = bucket.format('YYYY-MM-DD')
  const hour = bucket.format('HH:mm')
  const logPath = join(context.output, 'logs')

  let humanLog = join(logPath, `logs-${unit === 'h' ? hour : day}.log`)
  let jsonlLog = join(logPath, `logs-${day}.combined.jsonl`)

  ensureDirSync(logPath)

  const logger = createLogger({
    level: 'user',
    format: format.combine(
      format.timestamp(),
      // readable for humans
      format.printf(({level, message, timestamp, ...meta}) => {
        const extras = Object.keys(meta).length ? JSON.stringify(meta) : ''
        return `(${level}) ${message} (${timestamp}) ${extras}`
      }),
    ),
    levels: {
      error: 0,
      warn: 1,
      info: 2,
      status: 3,
      success: 4,
      user: 5,
      debug: 6,
    },
    transports: [
      // human-readable log file
      new transports.File({filename: humanLog}),
      // structured JSONL log file
      new transports.File({
        filename: jsonlLog,
        format: format.combine(
          format.timestamp(),
          format.json(), // one JSON object per line
        ),
      }),
    ],
  })

  const meta = {
    cli: context.cli,
    config: context.hash,
    node: process.version,
    os: process.platform,
    runner: `xgsd@v1`,
    context: context.id,
    docker: pathExistsSync('/.dockerenv'),
  }

  event.on('message', (msg) => {
    logger.log({
      level: msg.log.level,
      message: msg.log.message,
      cli: context.cli,
      config: context.hash,
      timestamp: msg.log.timestamp,
      node: process.version,
      os: process.platform,
      runner: `xgsd@v1`,
      context: msg.log.context,
      step: msg.log.step,
      docker: pathExistsSync('/.dockerenv'),
    })
  })

  event.on('error', (msg) => {
    logger.log({
      level: 'error',
      name: msg.error.name,
      message: msg.error.message,
      step: msg.step.name || msg.step.run,
      context: msg.context.id,
      cli: msg.context.cli,
      config: msg.context.hash,
      node: process.version,
      os: process.platform,
      runner: 'xgsd@v1',
      docker: pathExistsSync('/.dockerenv'),
    })
  })
}
