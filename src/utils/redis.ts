import { Redis } from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

let redisClient: Redis | null = null

try {
  // We use `maxRetriesPerRequest: null` and graceful reconnects
  // so the app doesn't crash if Redis is unavailable.
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000)
      if (times > 3) {
        console.warn('[Redis] Không thể kết nối. Hệ thống sẽ tự động vô hiệu hoá Cache và trỏ thẳng vào DB.')
        return null // Stop retrying
      }
      return delay
    },
  })

  redisClient.on('error', (err) => {
    // Suppress spammy errors after giving up
  })

  redisClient.on('connect', () => {
    console.log('[Redis] Đã kết nối thành công!')
  })
} catch (err) {
  console.warn('[Redis] Khởi tạo thất bại, bỏ qua Cache.', err)
}

export const redis = redisClient
