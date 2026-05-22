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

  // KIỂM TRA REDIS CACHE
  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        console.log(`[Redis] HIT - Tải dữ liệu Dashboard từ Cache (${cacheKey})`)
        const data = JSON.parse(cached)
        return (
          <div style={{ padding: '40px 24px' }}>
            <div style={{ marginBottom: '24px', paddingLeft: '24px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Tổng quan Cơ sở</h1>
              <p style={{ color: '#6b7280', margin: '8px 0 0' }}>Xem thống kê doanh thu và hoạt động của các phòng trọ <span style={{ color: '#10b981', fontSize: '12px' }}>(⚡ Cached)</span>.</p>
            </div>
            <ClientCharts 
              revenueData={data.revenueData} 
              occupancyData={data.occupancyData} 
              totalDebt={data.totalDebt} 
              totalRevenue={data.totalRevenue} 
            />
          </div>
        )
      }
    } catch (e) {
      console.warn('[Redis] Lỗi đọc cache:', e)
    }
  }

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
    // Currently nested queries might not work seamlessly on some relationships, 
    // but assuming Payload handles 'room.branch' for Postgres. If not, we might need a custom query or deep populate.
    // For now, let's pull all and filter if needed, but 'room.branch' should work.
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

  const resultData = {
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

  return (
    <div style={{ padding: '40px 24px' }}>
      <div style={{ marginBottom: '24px', paddingLeft: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Tổng quan Cơ sở</h1>
        <p style={{ color: '#6b7280', margin: '8px 0 0' }}>Xem thống kê doanh thu và hoạt động của các phòng trọ.</p>
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
