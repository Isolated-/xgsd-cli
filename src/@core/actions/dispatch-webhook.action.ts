import axios from 'axios'

export const dispatchWebhook = async (context: any) => {
  const url = context.url
  const payload = context.payload

  if (!url) {
    throw new Error('No webhook URL provided')
  }

  const response = await axios.post(url, payload)
  return response.data
}
