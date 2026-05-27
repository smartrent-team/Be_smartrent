import { PayOS } from '@payos/node'

const clientId = process.env.CLIENT_ID
const apiKey = process.env.API_KEY
const checksumKey = process.env.CHECKSUM_KEY

if (!clientId || !apiKey || !checksumKey) {
  throw new Error('PayOS variables are missing in environment')
}

export const payos = new PayOS({
  clientId,
  apiKey,
  checksumKey,
})
