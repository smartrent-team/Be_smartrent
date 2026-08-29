/**
 * Next.js Instrumentation Hook
 * Chạy tự động khi Next.js server khởi động (cả dev lẫn production).
 * Dùng để kick off scheduler auto-lock hợp đồng hết hạn mỗi 1 phút.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Chỉ chạy trên Node.js runtime (server-side), bỏ qua Edge runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { processExpiredCheckoutTenants } = await import('@/lib/auto-lock-expired')
    const { createAdminClient } = await import('@/lib/supabase/admin')

    const INTERVAL_MS = 30 * 1000 // 30 giây

    async function runAutoLock() {
      try {
        const supabase = createAdminClient()
        const { processed, results } = await processExpiredCheckoutTenants(supabase)

        const locked = results.filter((r) => r.action.startsWith('locked')).length
        const skipped = results.filter((r) => r.action === 'skipped').length
        const blocked = results.filter((r) => r.action.startsWith('blocked')).length
        const errors = results.filter((r) => r.action === 'error').length

        // Chỉ in log khi có thay đổi (locked), có lỗi (errors) hoặc bị chặn (blocked)
        if (locked > 0 || errors > 0 || blocked > 0) {
          console.log(
            `[auto-lock] ${new Date().toLocaleTimeString('vi-VN')} — processed: ${processed} | locked: ${locked} | skipped: ${skipped} | blocked: ${blocked} | errors: ${errors}`
          )
          
          for (const r of results) {
            if (r.action === 'skipped' || r.action.startsWith('blocked') || r.action === 'error') {
              console.log(`[auto-lock] ⚠ contractId=${r.contractId} tenantId=${r.tenantId} action="${r.action}" reason="${r.reason ?? 'N/A'}"`)
            }
          }
        }
      } catch (err) {
        console.error('[auto-lock] Lỗi quét hợp đồng:', err)
      }
    }

    console.log(`[auto-lock] Instrumentation khởi động — quét mỗi ${INTERVAL_MS / 60000} phút`)

    // Chạy ngay lập tức khi server start
    await runAutoLock()

    // Lặp lại mỗi 1 phút
    setInterval(runAutoLock, INTERVAL_MS)
  }
}
