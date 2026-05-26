'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertOctagon, RefreshCw, Home, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service if available
    console.error('Admin Area Crash:', error)
  }, [error])

  return (
    <div className="min-h-[85vh] w-full flex items-center justify-center p-6 bg-slate-50/50">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[20%] left-[30%] w-72 h-72 rounded-full bg-rose-200/30 blur-3xl" />
        <div className="absolute bottom-[20%] right-[30%] w-72 h-72 rounded-full bg-teal-200/30 blur-3xl" />
      </div>

      <Card className="max-w-[500px] w-full border-gray-100/50 backdrop-blur-md bg-white/95 shadow-2xl rounded-2xl overflow-hidden transform transition-all duration-300 hover:scale-[1.01]">
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4 shadow-inner">
            <AlertOctagon className="h-7 w-7 animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent">
            Hệ Thống Gặp Gián Đoạn
          </CardTitle>
          <p className="text-sm text-gray-500 mt-2">
            Đã có sự cố xảy ra khi giao tiếp với cơ sở dữ liệu Supabase hoặc dịch vụ mạng.
          </p>
        </CardHeader>

        <CardContent className="space-y-4 px-8 pb-6">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 font-mono text-xs text-rose-600/90 break-words max-h-[140px] overflow-y-auto shadow-inner">
            <div className="flex gap-2 items-start font-semibold text-slate-700 mb-1">
              <ShieldAlert className="h-4 w-4 shrink-0 text-slate-500" />
              <span>Mã lỗi kỹ thuật:</span>
            </div>
            {error.message || 'Unknown network error (Database connection timeout)'}
          </div>
          <p className="text-xs text-gray-400 text-center">
            Mã định danh sự cố: <span className="font-semibold text-slate-500">{error.digest || 'N/A'}</span>
          </p>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 px-8 pb-8 bg-slate-50/40 border-t border-slate-100/50 pt-6">
          <Button
            onClick={() => reset()}
            className="w-full sm:flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl shadow-md font-medium transition-all duration-200 gap-2 h-11"
          >
            <RefreshCw className="h-4 w-4" />
            Tải lại trang
          </Button>
          
          <Link href="/dashboard" className="w-full sm:flex-1">
            <Button
              variant="outline"
              className="w-full border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-medium transition-all duration-200 gap-2 h-11"
            >
              <Home className="h-4 w-4" />
              Về trang chủ
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
