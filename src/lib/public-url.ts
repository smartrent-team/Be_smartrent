import { headers } from 'next/headers'

/**
 * Returns the externally reachable application URL.
 *
 * `request.url` and `host` can point to localhost when Next.js is behind an
 * ngrok tunnel, so password-recovery links must prefer the configured public
 * URL.
 */
export async function getPublicAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '')
  }

  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
  const protocol = requestHeaders
      .get('x-forwarded-proto')
      ?.split(',')[0]
      .trim() ||
    (process.env.NODE_ENV === 'development' ? 'http' : 'https')

  if (!host) {
    throw new Error('Không xác định được địa chỉ công khai của ứng dụng')
  }

  return `${protocol}://${host}`
}
