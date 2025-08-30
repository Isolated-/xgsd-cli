// inside a pipeline.js (naming doesn't matter)
const hasherFn = async (input) => {
  const crypto = require('crypto')
  return {hash: crypto.createHash('sha256').update(input.data).digest('hex'), data: input.data}
}

const verifyHashFn = async (input) => {
  const crypto = require('crypto')
  const hash = crypto.createHash('sha256').update(input.data).digest('hex')

  let index = 0
  while (index < 5) {
    console.log('testing logging')

    if (index === 4) {
      console.error('oh no')
    }

    index++
  }

  return {valid: hash === input.hash}
}

// minimal config
module.exports = {
  timeout: 2000,
  max: 5,
  mode: 'chained',
  steps: [hasherFn, verifyHashFn],
}
