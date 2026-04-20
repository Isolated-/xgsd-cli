import {BlockEvent, ProjectEvent, SystemEvent} from '../types/events.types'
import {Plugin} from '../types/interfaces/plugin.interface'
import {byteSize} from '../util/misc.util'
import prettyBytes from 'pretty-bytes'
import chalk from 'chalk'
import ms = require('ms')

export class DebugPlugin implements Plugin {
  async on(e: any): Promise<void> {
    const {event, payload} = e

    console.log(`[DebugPlugin] event ${event}`)

    if (event === ProjectEvent.Started) {
      if (payload.context.lite) {
        console.warn(chalk.yellow(`currently running in development mode, considering removing --lite`))
      }
    }

    if (event === SystemEvent.ExtensionLoaded || event === SystemEvent.ExtensionUnloaded) {
      const loaded = event === SystemEvent.ExtensionLoaded ? 'loaded' : 'unloaded'
      console.log(`[${payload.name}] extension ${loaded}: ${payload.name} (core: ${payload.core})`)
    }

    if (event === BlockEvent.Failed) {
      console.warn(chalk.red(`[DebugPlugin] ${payload.name} has failed - reason: ${payload.error.message} stack:`))
      console.warn(chalk.red(payload.error.stack))
    }

    if (event === BlockEvent.Retrying) {
      console.warn(
        chalk.yellow(
          `[DebugPlugin] ${payload.block.name || payload.block.run} is failing, reason: ${payload.attempt.error.message}, retry: ${payload.attempt.attempt + 1}/${payload.attempt.maxRetries}, next attempt in ${ms(payload.attempt.nextMs)}`,
        ),
      )
    }

    console.log(`[DebugPlugin] size of this event is ${prettyBytes(byteSize(payload))}`)
  }
}
