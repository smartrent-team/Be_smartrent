import crypto from 'crypto'
import qs from 'qs'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

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

const url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=295000000&vnp_Command=pay&vnp_CreateDate=20260531195041&vnp_CurrCode=VND&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=ThanhToan_INV-202605-0001&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fwebhooks%2Fvnpay%2Freturn&vnp_TmnCode=TU6GNW0A&vnp_TxnRef=INV-202605-0001_1780231841888&vnp_Version=2.1.0"
const parsed = new URL(url)
const params: Record<string, string> = {}
parsed.searchParams.forEach((val, key) => {
  params[key] = val
})

const sorted = sortObject(params)
const signData = qs.stringify(sorted, { encode: false })
const hmac = crypto.createHmac('sha512', process.env.VNP_HASHSECRET!)
const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')
console.log("Calculated hash:", signed)
console.log("Expected hash:  ", "0070324837f0b0dc1885755ba8d4ab2d1724dc74cfbb79411a16dcdbcd9e1f675caa93432cca738fd4b43601fea8afb72ead974b67cadb6e4d6eb189ce97713d")
