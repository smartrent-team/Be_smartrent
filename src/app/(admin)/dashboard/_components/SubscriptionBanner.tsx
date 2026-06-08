'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ShieldAlert, Sparkles, Loader2 } from 'lucide-react'

type SubscriptionBannerProps = {
  planType: string
  maxBranches: number
  maxRooms: number
  currentBranches: number
  currentRooms: number
  subscriptionEndDate: string | null
}

export default function SubscriptionBanner({
  planType,
  maxBranches,
  maxRooms,
  currentBranches,
  currentRooms,
  subscriptionEndDate
}: SubscriptionBannerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isFree = planType === 'free'
  const roomUsagePercent = Math.round((currentRooms / maxRooms) * 100)

  const handleUpgrade = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/saas/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: 'pro', amount: 499000 })
      })

      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        alert(data.error || 'Có lỗi xảy ra')
        setIsLoading(false)
      }
    } catch (err) {
      alert('Lỗi kết nối')
      setIsLoading(false)
    }
  }

  return (
    <div className={`rounded-xl border p-6 mb-6 shadow-sm ${isFree ? 'bg-indigo-50/50 border-indigo-100' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100'}`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        
        {/* Thông tin gói cước */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {isFree ? <ShieldAlert className="w-5 h-5 text-indigo-500" /> : <Sparkles className="w-5 h-5 text-emerald-500" />}
            <h2 className="text-xl font-bold text-slate-800">
              {isFree ? 'Gói Cơ Bản (Miễn phí)' : 'Gói Chuyên Nghiệp (Pro)'}
            </h2>
            {!isFree && subscriptionEndDate && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                HSD: {new Date(subscriptionEndDate).toLocaleDateString('vi-VN')}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mb-4">
            {isFree 
              ? 'Nâng cấp gói cước để mở khóa thêm tài nguyên và các tính năng tự động hóa.' 
              : 'Cảm ơn bạn đã đồng hành cùng SmartRent. Hệ thống của bạn đang hoạt động ở hiệu suất tối đa.'}
          </p>

          {/* Thanh tiến trình */}
          <div className="flex gap-8 max-w-md">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Chi nhánh</span>
                <span className="font-medium text-slate-700">{currentBranches} / {maxBranches}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${currentBranches >= maxBranches ? 'bg-red-500' : 'bg-indigo-500'}`} 
                  style={{ width: `${Math.min((currentBranches / maxBranches) * 100, 100)}%` }} 
                />
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Phòng</span>
                <span className="font-medium text-slate-700">{currentRooms} / {maxRooms}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${roomUsagePercent >= 100 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                  style={{ width: `${Math.min(roomUsagePercent, 100)}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Nút bấm */}
        {isFree && (
          <div className="shrink-0 flex flex-col gap-2 w-full md:w-auto">
            <Button 
              onClick={handleUpgrade} 
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-12 px-6 rounded-xl shadow-lg shadow-indigo-200"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
              Nâng cấp gói Pro (499K)
            </Button>
            <div className="flex items-center gap-2 text-xs text-slate-500 justify-center md:justify-start">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Tự động hóa PayOS
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 justify-center md:justify-start">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Tối đa 5 chi nhánh, 200 phòng
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
