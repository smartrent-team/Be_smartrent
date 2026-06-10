import { Client } from '@upstash/qstash'

const token = process.env.QSTASH_TOKEN;

if (!token) {
  throw new Error('QStash environment variables are missing (QSTASH_TOKEN)');
}

export const qstashClient = new Client({
  token,
})
