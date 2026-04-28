import bytes from 'pretty-bytes'
import chalk from 'chalk'
import {BlockEvent, Plugin, SystemEvent} from '@xgsd/runtime'
import ms from 'pretty-ms'

export const sizeOf = (value: any): number => {
  if (Buffer.isBuffer(value)) return value.length
  if (typeof value === 'string') return Buffer.byteLength(value)
  if (Array.isArray(value)) return value.reduce((n, v) => n + sizeOf(v), 0)
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).reduce((n: number, v) => n + sizeOf(v), 0) as number
  }
  return 0
}

export const prettyMs = (input: string | number): string => {
  if (typeof input === 'string') {
    return input
  }

  return ms(input, {secondsDecimalDigits: 2, millisecondsDecimalDigits: 4})
}

export const prettyBytes = (input: string | number): string => {
  if (typeof input === 'string') {
    return input
  }

  return bytes(input, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export class DebugPlugin implements Plugin {
  async on(event: any, payload: any): Promise<void> {
    console.log(`[DebugPlugin] event ${event} (data size: ${prettyBytes(sizeOf(payload))}})`)

    if (event === SystemEvent.ExtensionLoaded || event === SystemEvent.ExtensionUnloaded) {
      const loaded = event === SystemEvent.ExtensionLoaded ? 'loaded' : 'unloaded'
      console.log(`[${payload.name}] extension ${loaded}: ${payload.name} (core: ${payload.core})`)
    }

    if (event === BlockEvent.Failed) {
      console.warn(
        chalk.red(
          `[DebugPlugin] ${payload.name ?? payload.block.run} has failed - reason: ${payload.error.message} stack:`,
        ),
      )
      console.warn(chalk.red(payload.error.stack))
    }

    if (event === BlockEvent.Retrying) {
      console.warn(
        chalk.yellow(
          `[DebugPlugin] ${payload.block.name ?? payload.block.run} is failing, reason: ${payload.attempt.error.message}, retry: ${payload.attempt.attempt + 1}/${payload.attempt.maxRetries}, next attempt in ${prettyMs(payload.attempt.nextMs)}`,
        ),
      )
    }

    if (event === SystemEvent.Ended) {
      console.log(
        chalk.bold(
          `project completed in ${prettyMs(Math.floor(payload.projectDuration))} (${prettyMs(payload.bootstrapDuration)} total runtime)`,
        ),
      )
    }
  }
}
