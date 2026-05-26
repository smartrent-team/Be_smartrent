// eslint-disable-next-line @typescript-eslint/no-require-imports
const PayOS = require('@payos/node')

const clientId = process.env.CLIENT_ID
const apiKey = process.env.API_KEY
const checksumKey = process.env.CHECKSUM_KEY

if (!clientId || !apiKey || !checksumKey) {
  throw new Error('PayOS variables are missing in environment')
}

// @payos/node is a CommonJS module — use require() to avoid TS2351 "not constructable" error
export const payos = new PayOS(clientId, apiKey, checksumKey)
