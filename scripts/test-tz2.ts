const date = new Date()
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

console.log(`${y}${m}${d}${H}${M}${s}`)
