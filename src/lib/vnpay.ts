import crypto from 'crypto'
import qs from 'qs'

function getVNPayDate(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date)

  const y = parts.find(p => p.type === 'year')?.value
  const m = parts.find(p => p.type === 'month')?.value
  const d = parts.find(p => p.type === 'day')?.value
  const H = parts.find(p => p.type === 'hour')?.value
  const M = parts.find(p => p.type === 'minute')?.value
  const s = parts.find(p => p.type === 'second')?.value

  return `${y}${m}${d}${H}${M}${s}`
}

function sortObject(obj: Record<string, string | number>) {
  const sorted: Record<string, string | number> = {}

  const keys = Object.keys(obj)
  keys.sort((a, b) => a.localeCompare(b))

  for (const key of keys) {
    const encodedKey = encodeURIComponent(key)
    const encodedValue = encodeURIComponent(obj[key].toString()).replace(/%20/g, '+')
    sorted[encodedKey] = encodedValue
  }

  return sorted
}

export function buildVNPayUrl(params: {
  orderId: string
  amount: number
  orderInfo: string
  ipAddr: string
}): string {
  const tmnCode = process.env.VNP_TMNCODE
  const secretKey = process.env.VNP_HASHSECRET
  let vnpUrl = process.env.VNP_URL
  const returnUrl = process.env.VNP_RETURN_URL

  if (!tmnCode || !secretKey || !vnpUrl || !returnUrl) {
    throw new Error('Thiếu cấu hình VNPay trong .env.local')
  }

  const createDate = getVNPayDate(new Date())

  let vnp_Params: Record<string, string | number> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: params.orderId,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: params.amount * 100,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: params.ipAddr,
    vnp_CreateDate: createDate,
  }

  vnp_Params = sortObject(vnp_Params)

  const signData = qs.stringify(vnp_Params, { encode: false })
  const hmac = crypto.createHmac('sha512', secretKey)
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')
  
  vnp_Params['vnp_SecureHash'] = signed
  vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false })

  return vnpUrl
}

export function verifyVNPaySignature(vnp_Params: Record<string, string | number>): boolean {
  const secretKey = process.env.VNP_HASHSECRET
  if (!secretKey) return false

  const secureHash = vnp_Params['vnp_SecureHash']

  // Lọc chỉ lấy các tham số bắt đầu bằng vnp_ (loại bỏ params rác do app tự thêm)
  const vnp_Filtered: Record<string, string | number> = {}
  for (const key in vnp_Params) {
    if (key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
      vnp_Filtered[key] = vnp_Params[key]
    }
  }

  const sortedParams = sortObject(vnp_Filtered)
  const signData = qs.stringify(sortedParams, { encode: false })
  
  const hmac = crypto.createHmac('sha512', secretKey)
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

  return secureHash === signed
}
