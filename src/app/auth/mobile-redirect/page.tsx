'use client'

/**
 * /auth/mobile-redirect
 *
 * Implicit flow: Supabase gửi link dạng
 *   /auth/mobile-redirect#access_token=xxx&type=recovery
 *
 * Hash fragment (#) không gửi lên server — phải đọc bằng JS client-side.
 * Trang này đọc hash, lấy access_token, rồi redirect sang deep link.
 */
import { useEffect, useState } from 'react'

export default function MobileRedirectPage() {
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const hash = window.location.hash // "#access_token=xxx&type=recovery&..."
    if (!hash) {
      // Không có hash → có thể là PKCE ?code= (không hỗ trợ ở đây)
      setStatus('error')
      setErrorMsg('Đường dẫn không hợp lệ. Vui lòng yêu cầu lại email khôi phục.')
      return
    }

    const params = new URLSearchParams(hash.substring(1)) // bỏ dấu #
    const accessToken = params.get('access_token')
    const type        = params.get('type')

    if (!accessToken || type !== 'recovery') {
      setStatus('error')
      setErrorMsg('Đường dẫn không hợp lệ hoặc đã hết hạn.')
      return
    }

    // Tạo deep link với access_token
    const deepLink = `smartrent://reset-password?access_token=${encodeURIComponent(accessToken)}`

    setStatus('redirecting')
    // Redirect sang app
    window.location.href = deepLink
  }, [])

  if (status === 'error') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', padding: 24,
        fontFamily: 'system-ui, sans-serif', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: '#c62828', marginBottom: 8 }}>Lỗi xác thực</h2>
        <p style={{ color: '#666', marginBottom: 24 }}>{errorMsg}</p>
        <a href="/forgot-password" style={{
          padding: '12px 24px', background: '#2e7d32', color: '#fff',
          borderRadius: 10, textDecoration: 'none', fontWeight: 700,
        }}>
          Yêu cầu lại email
        </a>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', padding: 24,
      fontFamily: 'system-ui, sans-serif', textAlign: 'center',
      background: '#f5f5f5',
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
        {status === 'loading' ? 'Đang xử lý...' : 'Đang mở ứng dụng SmartRent...'}
      </p>

      {status === 'redirecting' && (
        <>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
            Nếu app không tự mở, bấm nút bên dưới:
          </p>
          {/* Nút này chỉ hiện sau khi có access_token — dùng JS để set href */}
          <button
            id="open-app-btn"
            style={{
              padding: '14px 32px', background: '#2e7d32', color: '#fff',
              borderRadius: 12, border: 'none', fontWeight: 700,
              fontSize: 16, cursor: 'pointer', marginBottom: 16,
            }}
            onClick={() => {
              const hash = window.location.hash
              const params = new URLSearchParams(hash.substring(1))
              const token = params.get('access_token')
              if (token) {
                window.location.href = `smartrent://reset-password?access_token=${encodeURIComponent(token)}`
              }
            }}
          >
            Mở ứng dụng
          </button>
        </>
      )}
    </div>
  )
}
