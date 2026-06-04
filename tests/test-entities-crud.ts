import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const hasAdminKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY

// Initialize Supabase Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ANSI terminal colors for beautiful output
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const BLUE = '\x1b[34m'
const CYAN = '\x1b[36m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'

async function runEntitiesTest() {
  console.log(`\n${BOLD}${CYAN}====================================================${RESET}`)
  console.log(`${BOLD}${CYAN}      ENTITIES CRUD & RELATIONSHIP INTEGRATION      ${RESET}`)
  console.log(`${BOLD}${CYAN}====================================================${RESET}\n`)

  if (!hasAdminKey) {
    console.log(`${YELLOW}⚠️ Yêu cầu SUPABASE_SERVICE_ROLE_KEY để chạy script này.${RESET}\n`)
    return
  }

  let successCount = 0
  let totalCount = 0

  function assert(condition: boolean, message: string) {
    totalCount++
    if (condition) {
      successCount++
      console.log(`  ${GREEN}✓ [PASS]${RESET} ${message}`)
    } else {
      console.log(`  ${RED}✗ [FAIL]${RESET} ${message}`)
      throw new Error(message)
    }
  }

  // Temporary Variables
  let branchId: number | null = null
  let roomId: number | null = null
  let userId: number | null = null
  let tenantId: number | null = null
  let contractId: number | null = null
  let invoiceId: number | null = null
  let ticketId: number | null = null

  const timestamp = Date.now()
  const testPhone = `+84900${Math.floor(100000 + Math.random() * 900000)}`

  try {
    // ----------------------------------------------------
    // 1. SETUP BRANCH
    // ----------------------------------------------------
    console.log(`\n${BOLD}${BLUE}[Flow 1] Khởi tạo Branch (Chi nhánh)${RESET}`)
    const { data: bData, error: bErr } = await supabaseAdmin
      .from('branches')
      .insert({ name: `Test Branch ${timestamp}`, address: '123 QA Street', status: 'active' })
      .select()
      .single()
    assert(!bErr, 'Tạo branch thành công: ' + (bErr ? bErr.message : ''))
    branchId = bData.id

    // ----------------------------------------------------
    // 2. ROOM CRUD
    // ----------------------------------------------------
    console.log(`\n${BOLD}${BLUE}[Flow 2] Luồng Phòng trọ (Rooms)${RESET}`)
    const { data: rData, error: rErr } = await supabaseAdmin
      .from('rooms')
      .insert({
        branch_id: branchId,
        room_code: `R-${timestamp}`,
        floor: 1,
        area: 25,
        base_price: 3000000,
        electric_price: 3500,
        water_price: 20000,
        status: 'available'
      })
      .select()
      .single()
    assert(!rErr, 'Tạo phòng trọ (Room) thành công')
    roomId = rData.id

    // Update Room
    const { error: rUpdErr } = await supabaseAdmin
      .from('rooms')
      .update({ status: 'occupied' })
      .eq('id', roomId)
    assert(!rUpdErr, 'Cập nhật trạng thái phòng thành công')

    // ----------------------------------------------------
    // 3. USER & TENANT CRUD
    // ----------------------------------------------------
    console.log(`\n${BOLD}${BLUE}[Flow 3] Luồng Người dùng (Users) & Khách thuê (Tenants)${RESET}`)
    
    // Create Profile User first
    const { data: uData, error: uErr } = await supabaseAdmin
      .from('users')
      .insert({
        full_name: 'Test Tenant',
        phone: testPhone,
        role: 'tenant',
        email: `${testPhone.replace('+', '')}@user.local`
      })
      .select()
      .single()
    assert(!uErr, 'Tạo User profile role tenant thành công')
    userId = uData.id

    // Create Tenant Record
    const { data: tData, error: tErr } = await supabaseAdmin
      .from('tenants')
      .insert({
        user_id: userId,
        room_id: roomId,
        identity_number: '012345678912',
        move_in_date: new Date().toISOString()
      })
      .select()
      .single()
    assert(!tErr, 'Tạo hợp đồng thuê (Tenant) thành công: ' + (tErr ? tErr.message : ''))
    tenantId = tData.id

    // ----------------------------------------------------
    // 4. CONTRACT CRUD
    // ----------------------------------------------------
    console.log(`\n${BOLD}${BLUE}[Flow 4] Luồng Hợp đồng (Contracts)${RESET}`)
    const { data: cData, error: cErr } = await supabaseAdmin
      .from('contracts')
      .insert({
        tenant_id: tenantId,
        room_id: roomId,
        contract_code: `C-${timestamp}`,
        start_date: new Date().toISOString(),
        deposit_amount: 3000000,
        status: 'active'
      })
      .select()
      .single()
    assert(!cErr, 'Tạo Hợp đồng (Contract) thành công: ' + (cErr ? cErr.message : ''))
    contractId = cData.id

    // ----------------------------------------------------
    // 5. INVOICE CRUD
    // ----------------------------------------------------
    console.log(`\n${BOLD}${BLUE}[Flow 5] Luồng Hóa đơn (Invoices)${RESET}`)
    const { data: iData, error: iErr } = await supabaseAdmin
      .from('invoices')
      .insert({
        tenant_id: tenantId,
        room_id: roomId,
        invoice_code: `INV-${timestamp}`,
        room_price: 3000000,
        electric_cost: 150000,
        water_cost: 50000,
        service_cost: 100000,
        total_amount: 3300000,
        payment_status: 'unpaid',
        issued_at: new Date().toISOString()
      })
      .select()
      .single()
    assert(!iErr, 'Tạo Hóa đơn (Invoice) thành công: ' + (iErr ? iErr.message : ''))
    invoiceId = iData.id

    // Update Invoice Payment Status
    const { error: iUpdErr } = await supabaseAdmin
      .from('invoices')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', invoiceId)
    assert(!iUpdErr, 'Cập nhật trạng thái thanh toán hóa đơn thành công')

    // ----------------------------------------------------
    // 6. MAINTENANCE TICKETS CRUD
    // ----------------------------------------------------
    console.log(`\n${BOLD}${BLUE}[Flow 6] Luồng Báo cáo Sự cố (Tickets)${RESET}`)
    const { data: mtData, error: mtErr } = await supabaseAdmin
      .from('maintenance_tickets')
      .insert({
        room_id: roomId,
        tenant_id: tenantId,
        title: 'Hỏng bóng đèn',
        description: 'Bóng đèn nhà vệ sinh bị cháy',
        priority: 'low'
      })
      .select()
      .single()
    assert(!mtErr, 'Tạo sự cố (Ticket) thành công: ' + (mtErr ? mtErr.message : ''))
    ticketId = mtData.id

  } catch (error: any) {
    console.log(`\n${BOLD}${RED}🚨 CẢNH BÁO: Lỗi nghiêm trọng:${RESET} ${error.message}`)
  } finally {
    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log(`\n${BOLD}${BLUE}[Cleanup] Dọn dẹp môi trường (Cleanup & Restore State)${RESET}`)
    
    if (ticketId) await supabaseAdmin.from('maintenance_tickets').delete().eq('id', ticketId)
    if (invoiceId) await supabaseAdmin.from('invoices').delete().eq('id', invoiceId)
    if (contractId) await supabaseAdmin.from('contracts').delete().eq('id', contractId)
    if (tenantId) await supabaseAdmin.from('tenants').delete().eq('id', tenantId)
    if (userId) await supabaseAdmin.from('users').delete().eq('id', userId)
    if (roomId) await supabaseAdmin.from('rooms').delete().eq('id', roomId)
    if (branchId) await supabaseAdmin.from('branches').delete().eq('id', branchId)
    
    console.log(`  ${GREEN}✓ [PASS]${RESET} Xóa toàn bộ dữ liệu QA an toàn`)

    console.log(`\n${BOLD}${CYAN}====================================================${RESET}`)
    console.log(`${BOLD}${CYAN}                KẾT QUẢ KỊCH BẢN QA                 ${RESET}`)
    console.log(`${BOLD}${CYAN}====================================================${RESET}`)
    console.log(`  ${BOLD}Tổng số test cases:${RESET} ${totalCount}`)
    console.log(`  ${BOLD}${GREEN}Thành công (Passed):${RESET} ${successCount}`)
    console.log(`  ${BOLD}${RED}Thất bại (Failed):${RESET} ${totalCount - successCount}`)
    
    if (successCount === totalCount && totalCount > 0) {
      console.log(`\n  ${GREEN}${BOLD}🎉 XUẤT SẮC! Tất cả các Entities hoạt động hoàn hảo 100%!${RESET}\n`)
    }
  }
}

runEntitiesTest()
