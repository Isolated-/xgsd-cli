import axios from 'axios'

export const dispatchWebhook = async (context: any) => {
  const url = context.url
  const payload = context.result

  console.log(context)

  if (!url) {
    throw new Error('No webhook URL provided')
  }

  const response = await axios.post(url, payload)
  return response.data
}
