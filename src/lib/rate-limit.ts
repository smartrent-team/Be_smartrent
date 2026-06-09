import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { type NextRequest } from 'next/server'

// 1. Khởi tạo Redis client
const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

const redis = redisUrl && redisToken ? new Redis({
  url: redisUrl,
  token: redisToken,
}) : null

// 2. Định nghĩa các Policy Rate Limit

// Policy cho Đăng nhập / Quên mật khẩu (5 lần / 1 phút)
const authLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: 'ratelimit:auth',
}) : null

// Policy cho Đăng ký (3 lần / 1 giờ để chống spam rác DB)
const registerLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  analytics: true,
  prefix: 'ratelimit:register',
}) : null

// Fallback in-memory cho môi trường dev/local nếu thiếu biến môi trường
const ipRequests = new Map<string, { count: number; expiresAt: number }>()
function checkInMemoryLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = ipRequests.get(ip)
  
  if (!record || record.expiresAt < now) {
    ipRequests.set(ip, { count: 1, expiresAt: now + windowMs })
    return true
  }
  
  if (record.count >= limit) return false
  
  record.count += 1
  return true
}

// 3. Các hàm xuất ra để API sử dụng

export async function checkAuthRateLimit(request: NextRequest, actionName: string = 'auth') {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
  
  if (authLimiter) {
    const identifier = `${ip}-${actionName}`
    return await authLimiter.limit(identifier)
  }
  
  // Fallback: 5 lần / 1 phút
  const success = checkInMemoryLimit(`${ip}-${actionName}`, 5, 60 * 1000)
  return { success, limit: 5, remaining: success ? 1 : 0, reset: Date.now() }
}

export async function checkRegisterRateLimit(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
  
  if (registerLimiter) {
    const identifier = `${ip}-register`
    return await registerLimiter.limit(identifier)
  }
  
  // Fallback: 3 lần / 1 giờ
  const success = checkInMemoryLimit(`${ip}-register`, 3, 60 * 60 * 1000)
  return { success, limit: 3, remaining: success ? 1 : 0, reset: Date.now() }
}
