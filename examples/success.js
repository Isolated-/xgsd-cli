// inside a pipeline.js (naming doesn't matter)
const hasherFn = async (input) => {
  const crypto = require('crypto')
  return {hash: crypto.createHash('sha256').update(input.data).digest('hex'), data: input.data}
}

const verifyHashFn = async (input) => {
  const crypto = require('crypto')
  const hash = crypto.createHash('sha256').update(input.data).digest('hex')
  return {valid: hash === input.hash}
}

// minimal config
module.exports = {
  timeout: 2000,
  max: 5,
  mode: 'chained',
  steps: [hasherFn, verifyHashFn],
}
