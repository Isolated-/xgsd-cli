import {BlockEvent, SystemEvent} from '../@engine/types/events.types'
import {Plugin} from '../@engine/types/interfaces/plugin.interface'
import {byteSize} from '../util/misc.util'
import prettyBytes from 'pretty-bytes'
import chalk from 'chalk'
import ms = require('ms')

export class DebugPlugin implements Plugin {
  async on(e: any): Promise<void> {
    const {event, payload} = e

    console.log(`[DebugPlugin] event ${event}`)

    if (event === SystemEvent.ExtensionLoaded || event === SystemEvent.ExtensionUnloaded) {
      const loaded = event === SystemEvent.ExtensionLoaded ? 'loaded' : 'unloaded'
      console.log(`[DebugPlugin] extension ${loaded}: ${payload.name} (core: ${payload.core})`)
    }

    if (event === BlockEvent.Failed) {
      console.warn(chalk.red(`[DebugPlugin] ${payload.name} has failed - reason: ${payload.error.message} stack:`))
      console.warn(chalk.red(payload.error.stack))
    }

    if (event === BlockEvent.Retrying) {
      console.warn(
        chalk.yellow(
          `[DebugPlugin] ${payload.step.name || payload.step.run} is failing, reason: ${payload.attempt.error.message}, retry: ${payload.attempt.attempt + 1}/${payload.attempt.maxRetries}, next attempt in ${ms(payload.attempt.nextMs)}`,
        ),
      )
    }

    console.log(`[DebugPlugin] size of this event is ${prettyBytes(byteSize(payload))}`)
  }
}
