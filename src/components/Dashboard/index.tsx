import React from 'react'
import { getPayload } from 'payload'
import configPromise from '../../payload.config'
import { ClientCharts } from './ClientCharts'
import { redis } from '../../utils/redis'

export default async function CustomDashboard({ user }: { user: any }) {
  // Xác định điều kiện query theo quyền User
  let branchId = null
  if (user?.role === 'manager' && user?.branch) {
    branchId = typeof user.branch === 'object' ? user.branch.id : user.branch
  }

  const cacheKey = branchId ? `dashboard:branch:${branchId}` : 'dashboard:super_admin'

  let resultData = null
  let isCached = false

  // KIỂM TRA REDIS CACHE
  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        console.log(`[Redis] HIT - Tải dữ liệu Dashboard từ Cache (${cacheKey})`)
        resultData = JSON.parse(cached)
        isCached = true
      }
    } catch (e) {
      console.warn('[Redis] Lỗi đọc cache:', e)
    }
  }

  if (!resultData) {
    console.log(`[Redis] MISS - Đang Query DB cho ${cacheKey}...`)

    const payload = await getPayload({ config: configPromise })

    // 1. Query Rooms cho Tỷ lệ lấp đầy
    const roomsQuery: any = branchId ? { branch: { equals: branchId } } : {}
    const rooms = await payload.find({
      collection: 'rooms',
      where: roomsQuery,
      limit: 1000, // Đủ lớn để lấy hết phòng
    })

    let occupiedCount = 0
    let availableCount = 0
    let maintenanceCount = 0

    rooms.docs.forEach((room) => {
      if (room.status === 'occupied') occupiedCount++
      else if (room.status === 'available') availableCount++
      else if (room.status === 'maintenance') maintenanceCount++
    })

    const occupancyData = [
      { name: 'Đã thuê', value: occupiedCount },
      { name: 'Phòng trống', value: availableCount },
      { name: 'Bảo trì', value: maintenanceCount },
    ]

    // 2. Query Invoices cho Doanh thu & Công nợ
    const invoicesQuery: any = branchId ? { 'room.branch': { equals: branchId } } : {}
    const invoices = await payload.find({
      collection: 'invoices',
      limit: 5000, 
    })

    let totalDebt = 0
    let totalRevenue = 0
    
    // Array để nhóm theo tháng
    const monthlyRevenueMap: Record<string, number> = {}

    invoices.docs.forEach((invoice) => {
      // Nếu có branchId, filter in memory cho chắc chắn (phòng ngừa room.branch query bị lỗi)
      const invRoom = invoice.room as any
      const invBranchId = invRoom?.branch?.id || invRoom?.branch
      if (branchId && invBranchId !== branchId) return

      const amount = invoice.totalAmount || 0

      if (invoice.paymentStatus === 'unpaid' || invoice.paymentStatus === 'partial') {
        totalDebt += amount
      } else if (invoice.paymentStatus === 'paid') {
        totalRevenue += amount
        
        const date = new Date(invoice.paidAt || invoice.createdAt)
        const monthKey = `T${date.getMonth() + 1}/${date.getFullYear()}`
        
        if (!monthlyRevenueMap[monthKey]) monthlyRevenueMap[monthKey] = 0
        monthlyRevenueMap[monthKey] += amount
      }
    })

    // Đổi Map thành Array cho Recharts
    const revenueData = Object.keys(monthlyRevenueMap).map(key => ({
      name: key,
      total: monthlyRevenueMap[key]
    }))

    resultData = {
      revenueData,
      occupancyData,
      totalDebt,
      totalRevenue
    }

    // LƯU KẾT QUẢ VÀO REDIS CACHE (TTL 5 PHÚT = 300s)
    if (redis) {
      try {
        await redis.setex(cacheKey, 300, JSON.stringify(resultData))
      } catch (e) {
        console.warn('[Redis] Lỗi ghi cache:', e)
      }
    }
  }

  const userName = user?.name || user?.email?.split('@')[0] || 'Quản trị viên'

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Xin chào, {userName} 👋</h1>
        <p className="dashboard-subtitle">
          Tổng quan tình hình hoạt động của các phòng trọ.
          {isCached && <span style={{ color: '#10b981', marginLeft: '6px', fontWeight: 500 }}> (⚡ Cached)</span>}
        </p>
      </div>

      <ClientCharts 
        revenueData={resultData.revenueData} 
        occupancyData={resultData.occupancyData} 
        totalDebt={resultData.totalDebt} 
        totalRevenue={resultData.totalRevenue} 
      />
    </div>
  )
}
