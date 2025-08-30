const action = require('./action')

module.exports = [
  {
    fn: action,
    retries: 3,
    timeout: 2000,
  },
]
