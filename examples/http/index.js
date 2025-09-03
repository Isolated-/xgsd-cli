const axios = require('axios')
const crypto = require('crypto')

const fetchData = async (context) => {
  const {url} = context
  const response = await axios.get(url)
  return response.data
}

const hashResult = (data) => {
  const hash = crypto.createHash('sha256')
  hash.update(JSON.stringify(data))
  return hash.digest('hex')
}

module.exports = {fetchData, hashResult}
