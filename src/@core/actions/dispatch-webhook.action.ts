import axios from 'axios'
import {byteSize} from '../util/misc.util'

export const dispatchWebhook = async (context: any) => {
  const url = context.url
  const payload = context.result

  if (!url) {
    throw new Error('No webhook URL provided')
  }

  if (byteSize(payload) > 1024 * 1024 * 32) {
    // 32MB limit
    throw new Error('Payload size exceeds 32MB limit')
  }

  const response = await axios.post(url, payload)
  return response.data
}
