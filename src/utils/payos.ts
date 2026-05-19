import { PayOS } from '@payos/node'

export const payos = new PayOS({
  clientId: process.env.CLIENT_ID || '',
  apiKey: process.env.API_KEY || '',
  checksumKey: process.env.CHECKSUM_KEY || '',
})
