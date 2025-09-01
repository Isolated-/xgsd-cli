/**
 *  this is an example of using a signature and public key from xGSD
 *  with Node.js crypto (built in) verification.
 *  it's designed to ensure that we produce valid signatures,
 *  and they can be used outside of xGSD (they don't lock you in)
 *
 *  decryption and encryption examples will be added when implemented.
 */
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
