const {verify, createPublicKey} = require('crypto')

const signature = 'OgJL3P4RRXnaOThXezb77MDo8X8zztXE7nASigu8mDq5CWyqtxgnrkBAtJnaP4mwaMuHL9IIreV94esaVR_lAA'
const pubkey = 'MCowBQYDK2VwAyEA3HcPlgtNTwBPRblvqBGTJyi8lzFwqp3n95_hZyObtck'

const publicKey = createPublicKey({
  key: Buffer.from(pubkey, 'base64url'),
  format: 'der',
  type: 'spki',
})

const isValid = verify(null, Buffer.from('hello world'), publicKey, Buffer.from(signature, 'base64url'))
console.log(isValid)
