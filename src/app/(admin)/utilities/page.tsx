import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, Droplet, DollarSign, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

function calculateProviderElectricCost(totalUsage: number): number {
  if (totalUsage <= 100) {
    return totalUsage * 500;
  }
  if (totalUsage <= 200) {
    return 100 * 500 + (totalUsage - 100) * 1000;
  }
  return 100 * 500 + 100 * 1000 + (totalUsage - 200) * 2000;
}

export default async function UtilitiesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams
  
  // Parse month and year from searchParams or default to current
  const currentDate = new Date()
  const month = parseInt(params.month as string || String(currentDate.getMonth() + 1), 10)
  const year = parseInt(params.year as string || String(currentDate.getFullYear()), 10)
  
  const branchIdStr = params.branch_id as string
  const branchId = branchIdStr ? parseInt(branchIdStr, 10) : null
  
  // Verify auth
  const supabase = await createClient()
  await supabase.auth.getUser()
  const adminSupabase = createAdminClient()

  // Prepare start and end dates for the selected month
  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate = new Date(year, month, 1).toISOString()

  const query = adminSupabase
    .from('invoices')
    .select(`
      id, 
      invoice_code, 
      electric_old, 
      electric_new, 
      electric_cost, 
      water_old, 
      water_new, 
      water_cost, 
      room:rooms!inner(id, room_code, branch_id), 
      tenant:tenants(user:users(full_name))
    `)
    .gte('issued_at', startDate)
    .lt('issued_at', endDate)
    .order('created_at', { ascending: false })

  const { data: rawInvoices, error: queryError } = await query

  if (queryError) {
    console.error("Lỗi truy vấn invoices:", queryError)
  }

  // Fetch branches for filter
  const { data: branches } = await adminSupabase.from('branches').select('id, name').order('name')

  // Process data
  let invoices = ((rawInvoices as unknown[]) || []).map((inv: any) => {
    const roomObj = Array.isArray(inv.room) ? inv.room[0] : inv.room
    const tenantObj = Array.isArray(inv.tenant) ? inv.tenant[0] : inv.tenant
    const userObj = tenantObj ? (Array.isArray(tenantObj.user) ? tenantObj.user[0] : tenantObj.user) : null
    
    const electricUsage = (inv.electric_new || 0) - (inv.electric_old || 0)
    const waterUsage = (inv.water_new || 0) - (inv.water_old || 0)

    return {
      id: inv.id,
      room_code: roomObj?.room_code || 'Trống',
      branch_id: roomObj?.branch_id,
      tenant: userObj?.full_name || 'Khách vãng lai',
      electric_old: inv.electric_old || 0,
      electric_new: inv.electric_new || 0,
      electric_usage: electricUsage > 0 ? electricUsage : 0,
      electric_cost: inv.electric_cost || 0,
      water_old: inv.water_old || 0,
      water_new: inv.water_new || 0,
      water_usage: waterUsage > 0 ? waterUsage : 0,
      water_cost: inv.water_cost || 0,
    }
  })

  // Sắp xếp các phòng theo mã phòng cho dễ nhìn
  invoices.sort((a, b) => a.room_code.localeCompare(b.room_code))

  if (branchId) {
    invoices = invoices.filter(inv => inv.branch_id === branchId)
  }

  // Calculate totals
  const totalElectricUsage = invoices.reduce((sum, inv) => sum + inv.electric_usage, 0)
  const totalElectricCost = invoices.reduce((sum, inv) => sum + inv.electric_cost, 0)
  const totalWaterUsage = invoices.reduce((sum, inv) => sum + inv.water_usage, 0)
  const totalWaterCost = invoices.reduce((sum, inv) => sum + inv.water_cost, 0)
  const totalCost = totalElectricCost + totalWaterCost

  // Tính tiền trả điện lực và lợi nhuận
  const providerElectricCost = calculateProviderElectricCost(totalElectricUsage)
  const electricProfit = totalElectricCost - providerElectricCost

  // Generate previous and next month links
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  
  const getFilterUrl = (m: number, y: number, bId: number | null) => {
    const searchParams = new URLSearchParams()
    searchParams.set('month', m.toString())
    searchParams.set('year', y.toString())
    if (bId) searchParams.set('branch_id', bId.toString())
    return `/utilities?${searchParams.toString()}`
  }

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-slate-50/50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Thống kê Điện Nước
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Theo dõi chỉ số và chi phí tiêu thụ điện nước của từng phòng theo kỳ.
          </p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <Link href={getFilterUrl(prevMonth, prevYear, branchId)}>
            <Button variant="outline" size="sm">&larr; Tháng trước</Button>
          </Link>
          <span className="font-semibold text-lg text-primary">Tháng {month}/{year}</span>
          <Link href={getFilterUrl(nextMonth, nextYear, branchId)}>
            <Button variant="outline" size="sm">Tháng sau &rarr;</Button>
          </Link>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Chi nhánh:</span>
          <div className="flex gap-2">
            <Link href={getFilterUrl(month, year, null)}>
              <Button variant={!branchId ? 'default' : 'outline'} size="sm" className="whitespace-nowrap">Tất cả</Button>
            </Link>
            {branches?.map(b => (
              <Link key={b.id} href={getFilterUrl(month, year, b.id)}>
                <Button variant={branchId === b.id ? 'default' : 'outline'} size="sm" className="whitespace-nowrap">{b.name}</Button>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-amber-200/50 shadow-sm bg-gradient-to-br from-amber-50/50 to-white overflow-visible z-10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-amber-700 flex items-center">
              Tổng tiêu thụ điện
              <div className="relative group ml-1.5 flex items-center">
                <Info className="h-4 w-4 text-amber-600/70 hover:text-amber-600 cursor-pointer transition-colors" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-56 p-2.5 bg-gray-900 text-white text-xs rounded-md shadow-lg z-50 pointer-events-none">
                  <p className="font-semibold mb-1">Tính tiền điện lực:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-gray-200">
                    <li>0 - 100 số: 500đ / số</li>
                    <li>101 - 200 số: 1.000đ / số</li>
                    <li>Trên 200 số: 2.000đ / số</li>
                  </ul>
                  <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </CardTitle>
            <div className="p-2 bg-amber-100/80 rounded-lg">
              <Zap className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800 mb-2">{totalElectricUsage.toLocaleString()} <span className="text-sm text-muted-foreground font-normal">kWh</span></div>
            <div className="space-y-1 text-sm border-t border-amber-200/50 pt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Thu cư dân:</span>
                <span className="font-medium text-gray-700">{totalElectricCost.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trả điện lực:</span>
                <span className="font-medium text-red-600">-{providerElectricCost.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between pt-1 font-semibold">
                <span className="text-amber-800">Lợi nhuận:</span>
                <span className="text-amber-600">+{electricProfit.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200/50 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-blue-700">Tổng tiêu thụ nước</CardTitle>
            <div className="p-2 bg-blue-100/80 rounded-lg">
              <Droplet className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">{totalWaterUsage.toLocaleString()} <span className="text-sm text-muted-foreground font-normal">m³</span></div>
            <p className="text-xs font-medium text-blue-600 mt-1">Thành tiền: {totalWaterCost.toLocaleString('vi-VN')} đ</p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200/50 shadow-sm bg-gradient-to-br from-green-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-green-700">Tổng cộng chi phí</CardTitle>
            <div className="p-2 bg-green-100/80 rounded-lg">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">{totalCost.toLocaleString('vi-VN')} <span className="text-sm text-muted-foreground font-normal">đ</span></div>
            <p className="text-xs font-medium text-green-600 mt-1">Gồm tiền điện và nước</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/80 border-b">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px] font-semibold text-gray-700">Phòng</TableHead>
                <TableHead className="min-w-[150px] font-semibold text-gray-700">Khách thuê</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">Số điện cũ</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">Số điện mới</TableHead>
                <TableHead className="text-right font-bold text-amber-700 bg-amber-50/40">Tiêu thụ điện</TableHead>
                <TableHead className="text-right font-bold text-amber-700 bg-amber-50/40">Tiền điện</TableHead>
                <TableHead className="text-right font-semibold text-gray-700 border-l">Số nước cũ</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">Số nước mới</TableHead>
                <TableHead className="text-right font-bold text-blue-700 bg-blue-50/40">Tiêu thụ nước</TableHead>
                <TableHead className="text-right font-bold text-blue-700 bg-blue-50/40">Tiền nước</TableHead>
                <TableHead className="text-right font-bold text-gray-900 border-l bg-gray-50/80">Tổng tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                    <TableCell className="font-semibold text-gray-700">P.{inv.room_code}</TableCell>
                    <TableCell className="text-gray-600">{inv.tenant}</TableCell>
                    <TableCell className="text-right text-gray-500">{inv.electric_old}</TableCell>
                    <TableCell className="text-right text-gray-500">{inv.electric_new}</TableCell>
                    <TableCell className="text-right font-semibold text-amber-600 bg-amber-50/20">{inv.electric_usage}</TableCell>
                    <TableCell className="text-right font-medium text-amber-700 bg-amber-50/20">{inv.electric_cost.toLocaleString('vi-VN')} đ</TableCell>
                    
                    <TableCell className="text-right text-gray-500 border-l">{inv.water_old}</TableCell>
                    <TableCell className="text-right text-gray-500">{inv.water_new}</TableCell>
                    <TableCell className="text-right font-semibold text-blue-600 bg-blue-50/20">{inv.water_usage}</TableCell>
                    <TableCell className="text-right font-medium text-blue-700 bg-blue-50/20">{inv.water_cost.toLocaleString('vi-VN')} đ</TableCell>
                    
                    <TableCell className="text-right font-bold text-gray-800 border-l bg-gray-50/40">{(inv.electric_cost + inv.water_cost).toLocaleString('vi-VN')} đ</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="text-center h-32 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Zap className="h-8 w-8 text-gray-300" />
                      <p>Không có dữ liệu tiêu thụ cho tháng này.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {invoices.length > 0 && (
              <TableFooter className="bg-gray-100/80 border-t-2 border-gray-200">
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={2} className="font-bold text-gray-700 text-lg">TỔNG CỘNG</TableCell>
                  <TableCell colSpan={2}></TableCell>
                  <TableCell className="text-right font-bold text-amber-700 text-base">{totalElectricUsage.toLocaleString()} kWh</TableCell>
                  <TableCell className="text-right font-bold text-amber-700 text-base">{totalElectricCost.toLocaleString('vi-VN')} đ</TableCell>
                  <TableCell colSpan={2} className="border-l border-gray-300"></TableCell>
                  <TableCell className="text-right font-bold text-blue-700 text-base">{totalWaterUsage.toLocaleString()} m³</TableCell>
                  <TableCell className="text-right font-bold text-blue-700 text-base">{totalWaterCost.toLocaleString('vi-VN')} đ</TableCell>
                  <TableCell className="text-right font-black text-green-700 text-base border-l border-gray-300 bg-green-50/30">{totalCost.toLocaleString('vi-VN')} đ</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>
    </div>
  )
}
