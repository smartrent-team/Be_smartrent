'use client'

/**
 * /auth/mobile-redirect
 *
 * Xử lý cả 2 flow Supabase gửi về:
 *  - PKCE  : /auth/mobile-redirect?code=xxx   → exchange bằng Supabase JS (browser)
 *  - Implicit: /auth/mobile-redirect#access_token=xxx → đọc hash trực tiếp
 *
 * Sau khi có access_token → redirect sang deep link smartrent://reset-password
 */
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function MobileRedirectPage() {
  const [status, setStatus]   = useState<'loading' | 'redirecting' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [deepLink, setDeepLink] = useState('')

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()

      // ── Implicit flow: đọc hash fragment ────────────────────────────────
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        const params      = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const type        = params.get('type')

        if (accessToken && type === 'recovery') {
          const link = `smartrent://reset-password?access_token=${encodeURIComponent(accessToken)}`
          setDeepLink(link)
          setStatus('redirecting')
          window.location.href = link
          return
        }
      }

      // ── PKCE flow: exchange ?code= bằng Supabase JS client (browser) ────
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')

      if (code) {
        // Thử exchange — chỉ hoạt động nếu PKCE tắt trên Supabase Dashboard
        // Nếu lỗi "code verifier not found" → fallback về web update-password
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error || !data.session) {
          // Fallback: gửi thẳng code về trang web đổi mật khẩu
          // (update-password page xử lý được cả code lẫn token_hash)
          window.location.href = `/update-password?code=${encodeURIComponent(code)}&source=web`
          return
        }
        const accessToken = data.session.access_token
        const link = `smartrent://reset-password?access_token=${encodeURIComponent(accessToken)}`
        setDeepLink(link)
        setStatus('redirecting')
        window.location.href = link
        return
      }

      // Không có code hay hash
      setStatus('error')
      setErrorMsg('Đường dẫn không hợp lệ. Vui lòng yêu cầu lại email khôi phục.')
    }

    run()
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
      fontFamily: 'system-ui, sans-serif', textAlign: 'center', background: '#f5f5f5',
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

      {status === 'redirecting' && deepLink && (
        <>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
            Nếu app không tự mở, bấm nút bên dưới:
          </p>
          <a href={deepLink} style={{
            display: 'inline-block', padding: '14px 32px', background: '#2e7d32',
            color: '#fff', borderRadius: 12, textDecoration: 'none',
            fontWeight: 700, fontSize: 16, marginBottom: 16,
          }}>
            Mở ứng dụng
          </a>
        </>
      )}
    </div>
  )
}
