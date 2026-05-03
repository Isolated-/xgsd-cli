import {Plugin} from '@xgsd/runtime'

export class UserLogsPlugin implements Plugin {
  events = ['system.message']

  async on(event: string, payload: any): Promise<void> {
    // sanity check
    if (event !== 'system.message') return

    console.log(payload.message)
  }
}
