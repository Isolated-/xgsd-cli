const axios = require('axios')

const httpGetAction = async (data) => {
  if (!data.url) {
    throw new Error('URL is required')
  }

  const result = await axios.get(data.url)
  return result.data
}

const responseTransformer = (data) => {
  return data.result
}

const logPipe = (data) => console.log(data)

module.exports = {
  name: 'HTTP Pipeline',
  max: 5,
  timeout: 10000,
  mode: 'chained',
  steps: [httpGetAction, responseTransformer, logPipe],
}
