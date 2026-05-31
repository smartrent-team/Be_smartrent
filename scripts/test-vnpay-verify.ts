import { buildVNPayUrl, verifyVNPaySignature } from '../src/lib/vnpay'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const orderId = 'TEST_' + Date.now()
const amount = 10000
const orderInfo = 'Thanh toán hoá đơn'
const ipAddr = '127.0.0.1'

console.log('Building URL...')
const url = buildVNPayUrl({ orderId, amount, orderInfo, ipAddr })
console.log('URL:', url)

console.log('Extracting params to verify...')
const parsedUrl = new URL(url)
const params: Record<string, string> = {}
parsedUrl.searchParams.forEach((val, key) => {
  params[key] = val
})

console.log('Params extracted:', params)

const isValid = verifyVNPaySignature(params)
console.log('Signature is valid?', isValid)
