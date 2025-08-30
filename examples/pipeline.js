const action = require('./action')
const upperCaseAction = require('./uppercase')
const blockingAction = require('./blocking')
const failingAction = require('./failing')

module.exports = {
  runtime: 'xgsd@v1',
  timeout: 500,
  retries: 3,
  mode: 'fanout',
  validate: (data) => {
    if (!data || typeof data !== 'object') {
      return false
    }

    return true
  },
  delay: (attempt) => Math.pow(3, attempt) * 100,
  steps: [action, blockingAction, failingAction, upperCaseAction],
}
