/**
 * /auth/mobile-redirect
 *
 * Trang trung gian — nhận params từ Supabase email rồi redirect
 * ngay sang deep link smartrent://reset-password để mở app.
 *
 * Supabase gửi 2 dạng tuỳ cấu hình Auth:
 *  - PKCE flow : ?code=xxx
 *  - OTP flow  : ?token_hash=xxx&type=recovery
 */
import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function MobileRedirectPage({ searchParams }: Props) {
  const params     = await searchParams
  const code       = params['code']
  const tokenHash  = params['token_hash']
  const type       = params['type']

  // Xây deep link với bất kỳ param nào Supabase gửi về
  const qs = new URLSearchParams()

  if (code) {
    qs.set('code', code)
  } else if (tokenHash) {
    qs.set('token_hash', tokenHash)
    if (type) qs.set('type', type)
  } else {
    redirect('/forgot-password?message=' + encodeURIComponent('Đường dẫn không hợp lệ hoặc đã hết hạn.'))
  }

  const deepLink    = `smartrent://reset-password?${qs.toString()}`
  const webFallback = `/update-password?${qs.toString()}&source=web`

  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Mở ứng dụng SmartRent...</title>
        <meta httpEquiv="refresh" content={`0;url=${deepLink}`} />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f5f5' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', padding: '24px', textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: '#e8f5e9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24, fontSize: 36,
          }}>🔐</div>

          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
            Đặt lại mật khẩu
          </h1>
          <p style={{ fontSize: 15, color: '#666', marginBottom: 32, maxWidth: 320 }}>
            Đang mở ứng dụng SmartRent...
          </p>

          <a href={deepLink} style={{
            display: 'inline-block', padding: '14px 32px', background: '#2e7d32',
            color: '#fff', borderRadius: 12, textDecoration: 'none',
            fontWeight: 700, fontSize: 16, marginBottom: 16,
          }}>
            Mở ứng dụng
          </a>

          <a href={webFallback} style={{ fontSize: 13, color: '#888', textDecoration: 'underline' }}>
            Đổi mật khẩu trên trình duyệt
          </a>
        </div>
      </body>
    </html>
  )
}
