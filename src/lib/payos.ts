import { PayOS } from '@payos/node'

function readPayOsEnv(name: string, legacyName?: string): string | undefined {
  const value = process.env[name] ?? (legacyName ? process.env[legacyName] : undefined)
  return value?.trim() || undefined
}

const clientId = readPayOsEnv('PAYOS_CLIENT_ID', 'CLIENT_ID')
const apiKey = readPayOsEnv('PAYOS_API_KEY', 'API_KEY')
const checksumKey = readPayOsEnv('PAYOS_CHECKSUM_KEY', 'CHECKSUM_KEY')

if (!clientId || !apiKey || !checksumKey) {
  throw new Error(
    'Thiếu cấu hình PayOS. Thêm PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY vào .env (lấy từ my.payos.vn → Kênh thanh toán).'
  )
}

export const payos = new PayOS({
  clientId,
  apiKey,
  checksumKey,
  partnerCode: readPayOsEnv('PAYOS_PARTNER_CODE', 'PARTNER_CODE'),
  baseURL: readPayOsEnv('PAYOS_BASE_URL'),
})

export function isPayOsConfigured(): boolean {
  return Boolean(clientId && apiKey && checksumKey)
}
