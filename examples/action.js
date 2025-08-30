/**
 *  user code example (subject to change)
 *  user code is fully isolated and all variables
 *  should be defined within the function
 *  @param {*} context
 *  @returns
 */
const myAction = async (context) => {
  const crypto = require('crypto')

  const data = context.data
  const hash = crypto.createHash('sha256').update(data).digest('hex')

  return hash
}
module.exports = myAction
