/**
 * /auth/mobile-redirect
 *
 * Trang trung gian — nhận token_hash từ email Supabase rồi redirect
 * ngay sang deep link smartrent://reset-password để mở app.
 *
 * Nếu app chưa cài hoặc deep link thất bại, hiện nút fallback về web.
 */
import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ token_hash?: string; type?: string }>
}

export default async function MobileRedirectPage({ searchParams }: Props) {
  const { token_hash, type } = await searchParams

  // Nếu không có token → về trang quên mật khẩu
  if (!token_hash || type !== 'recovery') {
    redirect('/forgot-password?message=' + encodeURIComponent('Đường dẫn không hợp lệ hoặc đã hết hạn.'))
  }

  const deepLink = `smartrent://reset-password?token_hash=${encodeURIComponent(token_hash)}&type=recovery`
  const webFallback = `/update-password?token_hash=${encodeURIComponent(token_hash)}&type=recovery&source=web`

  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Mở ứng dụng SmartRent...</title>
        {/* Redirect ngay lập tức bằng meta refresh → deep link */}
        <meta httpEquiv="refresh" content={`0;url=${deepLink}`} />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f5f5' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          textAlign: 'center',
        }}>
          {/* Logo / icon */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#e8f5e9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            fontSize: 36,
          }}>
            🔐
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
            Đặt lại mật khẩu
          </h1>
          <p style={{ fontSize: 15, color: '#666', marginBottom: 32, maxWidth: 320 }}>
            Đang mở ứng dụng SmartRent để đặt lại mật khẩu của bạn...
          </p>

          {/* Nút mở app thủ công nếu meta refresh không chạy */}
          <a
            href={deepLink}
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              background: '#2e7d32',
              color: '#fff',
              borderRadius: 12,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 16,
              marginBottom: 16,
            }}
          >
            Mở ứng dụng
          </a>

          {/* Fallback về web nếu app chưa cài */}
          <a
            href={webFallback}
            style={{
              fontSize: 13,
              color: '#888',
              textDecoration: 'underline',
            }}
          >
            Đổi mật khẩu trên trình duyệt
          </a>
        </div>
      </body>
    </html>
  )
}
