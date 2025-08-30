const myAction = async (context) => {
  const crypto = require('crypto')

  const data = context.data
  const hash = crypto.createHash('sha256').update(data).digest('hex')

  return hash
}
module.exports = myAction
