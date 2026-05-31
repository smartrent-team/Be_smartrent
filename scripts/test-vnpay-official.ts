import crypto from 'crypto'
import qs from 'qs'

// Official VNPay sortObject
function sortObjectOfficial(obj: any) {
  let sorted: any = {};
  let str = [];
  let key;
  for (key in obj){
    if (obj.hasOwnProperty(key)) {
    str.push(encodeURIComponent(key));
    }
  }
  str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

// Our sortObject
function sortObjectOur(obj: Record<string, string | number>) {
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

const vnp_Params = {
  vnp_Amount: 295000000,
  vnp_Command: 'pay',
  vnp_CreateDate: '20260531202200',
  vnp_CurrCode: 'VND',
  vnp_IpAddr: '127.0.0.1',
  vnp_Locale: 'vn',
  vnp_OrderInfo: 'ThanhToanINV2026050001',
  vnp_OrderType: 'other',
  vnp_ReturnUrl: 'http://localhost:3000/api/webhooks/vnpay/return',
  vnp_TmnCode: 'TU6GNW0A',
  vnp_TxnRef: 'INV20260500011780231841888',
  vnp_Version: '2.1.0'
}

const officialSorted = sortObjectOfficial({...vnp_Params})
const ourSorted = sortObjectOur({...vnp_Params})

const signDataOfficial = qs.stringify(officialSorted, { encode: false })
const signDataOur = qs.stringify(ourSorted, { encode: false })

console.log("signData matches:", signDataOfficial === signDataOur)
if (signDataOfficial !== signDataOur) {
  console.log("Official:", signDataOfficial)
  console.log("Our     :", signDataOur)
}

