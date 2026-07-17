'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { verifySuperAdmin, verifyRole } from '@/lib/rbac'
import { attachVNPayToInvoice } from '@/lib/invoice-payment'
import { revalidatePath } from 'next/cache'
import { calculateElectricityCost, calculateWaterCost } from '@/lib/billing'
import { dispatchNotification } from '@/lib/notification_dispatch'
import { invoiceSchema, formatZodError } from '@/lib/validations'
import { defaultInvoiceDueDate } from '@/lib/invoice-due-date'
import { assertManagerCanAccessInvoice } from '@/lib/invoice-access'

export async function createInvoice(
  data: {
    room_id: number
    tenant_id?: number
    utility_log_id?: number
    roomPrice: number
    serviceCost?: number
    electricCost?: number
    waterCost?: number
    electricOld?: number
    electricNew?: number
    waterOld?: number
    waterNew?: number
  },
  supabaseClient?: SupabaseClient
) {
  try {
    const supabase = supabaseClient || (await verifySuperAdmin())

    const totalAmount = data.roomPrice + (data.serviceCost || 0) + (data.electricCost || 0) + (data.waterCost || 0)

    const date = new Date()
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`

    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('room_id', data.room_id)
      .like('invoice_code', `INV-${yearMonth}-%`)
      .maybeSingle()

    if (existingInvoice) {
      throw new Error(
        `Phòng này đã được tạo hóa đơn trong tháng ${date.getMonth() + 1}/${date.getFullYear()}. Vui lòng kiểm tra lại danh sách Hóa đơn.`
      )
    }

    const { data: lastInvoices } = await supabase
      .from('invoices')
      .select('invoice_code')
      .like('invoice_code', `INV-${yearMonth}-%`)
      .order('created_at', { ascending: false })
      .limit(1)

    let nextNumber = 1
    if (lastInvoices && lastInvoices.length > 0) {
      const lastNumStr = lastInvoices[0].invoice_code.split('-').pop() || '0'
      nextNumber = parseInt(lastNumStr, 10) + 1
    }

    const invoiceCode = `INV-${yearMonth}-${String(nextNumber).padStart(4, '0')}`
    const issuedAt = new Date()

    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        invoice_code: invoiceCode,
        room_id: data.room_id,
        tenant_id: data.tenant_id,
        utility_log_id: data.utility_log_id,
        room_price: data.roomPrice,
        service_cost: data.serviceCost || 0,
        electric_cost: data.electricCost || 0,
        water_cost: data.waterCost || 0,
        electric_old: data.electricOld ?? null,
        electric_new: data.electricNew ?? null,
        water_old: data.waterOld ?? null,
        water_new: data.waterNew ?? null,
        total_amount: totalAmount,
        payment_status: 'unpaid',
        issued_at: issuedAt.toISOString(),
        due_date: defaultInvoiceDueDate(issuedAt).toISOString(),
      })
      .select()
      .single()

    if (insertError) throw insertError

    let tenantId = data.tenant_id
    if (!tenantId) {
      const { data: activeTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('room_id', data.room_id)
        .is('move_out_date', null)
        .maybeSingle()
      if (activeTenant?.id) {
        tenantId = activeTenant.id
        await supabase.from('invoices').update({ tenant_id: tenantId }).eq('id', invoice.id)
      }
    }

    let paymentWarning: string | null = null
    let payment:
      | {
          checkoutUrl: string
          amount: number
          invoiceCode: string
        }
      | null = null

    if (totalAmount > 0 && totalAmount >= 5000) {
      const { payment: pay, warning } = await attachVNPayToInvoice(supabase, {
        id: invoice.id,
        invoice_code: invoiceCode,
        total_amount: totalAmount,
      })
      if (pay) {
        payment = {
          checkoutUrl: pay.checkoutUrl,
          amount: totalAmount,
          invoiceCode,
        }
      } else if (warning) {
        console.warn('⚠️ VNPay:', warning)
        paymentWarning = warning
      }
    }

    if (tenantId) {
      try {
        await resendInvoiceNotification(invoice.id, supabase)
      } catch (err) {
        console.error('Lỗi khi gửi thông báo tự động:', err)
      }
    }

    return { success: true, invoiceId: invoice.id, invoiceCode, paymentWarning, payment, tenantId }
  } catch (error: unknown) {
    console.error('Lỗi khi tạo hóa đơn:', error)
    let errorMessage = 'Lỗi không xác định'
    if (error) {
      if (typeof error === 'object') {
        const typedError = error as { message?: string; details?: string }
        errorMessage = typedError.message || typedError.details || JSON.stringify(error)
      } else {
        errorMessage = String(error)
      }
    }
    return { success: false, error: errorMessage }
  }
}

export async function resendInvoiceNotification(
  invoiceId: string | number,
  supabaseClient?: SupabaseClient
) {
  try {
    let supabase = supabaseClient
    let resolvedId: number

    if (!supabase) {
      const auth = await verifyRole()
      if (auth.error || !auth.user || !auth.role) {
        return { success: false, error: auth.error || 'Chưa xác thực' }
      }

      if (auth.role !== 'super_admin' && auth.role !== 'manager') {
        return { success: false, error: 'Bạn không có quyền thực hiện hành động này' }
      }

      supabase = auth.supabase!

      // Check manager access & resolve invoice ID/code
      const isNumeric = /^\d+$/.test(String(invoiceId));
      let accessQuery = supabase.from('invoices').select('id, invoice_code, total_amount, payment_status, tenant_id, room_id, rooms(branch_id)')
      if (isNumeric) {
        accessQuery = accessQuery.eq('id', Number(invoiceId))
      } else {
        accessQuery = accessQuery.eq('invoice_code', invoiceId)
      }
      const { data: checkInvoice, error: checkError } = await accessQuery.maybeSingle()
      if (checkError || !checkInvoice) {
        throw new Error(checkError?.message || 'Không tìm thấy hóa đơn')
      }

      if (auth.role === 'manager') {
        const access = await assertManagerCanAccessInvoice(supabase, checkInvoice.id, auth.role, auth.branchId)
        if (!access.ok) return { success: false, error: access.error }
      }
      resolvedId = checkInvoice.id
    } else {
      // Resolve invoice ID/code using the passed supabase client
      const isNumeric = /^\d+$/.test(String(invoiceId));
      let accessQuery = supabase.from('invoices').select('id')
      if (isNumeric) {
        accessQuery = accessQuery.eq('id', Number(invoiceId))
      } else {
        accessQuery = accessQuery.eq('invoice_code', invoiceId)
      }
      const { data: checkInvoice, error: checkError } = await accessQuery.maybeSingle()
      if (checkError || !checkInvoice) {
        throw new Error(checkError?.message || 'Không tìm thấy hóa đơn')
      }
      resolvedId = checkInvoice.id
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('id, invoice_code, total_amount, tenant_id, room:rooms(room_code), tenant:tenants(user:users(full_name))')
      .eq('id', resolvedId)
      .single()

    if (error || !invoice || !invoice.tenant_id) {
      throw new Error('Không tìm thấy hóa đơn hoặc người thuê')
    }

    const roomData = invoice.room as unknown
    const roomObj = Array.isArray(roomData)
      ? (roomData[0] as { room_code?: string } | undefined)
      : (roomData as { room_code?: string } | null)
    const roomCode = roomObj?.room_code || '?'

    const { data: tenantUser } = await supabase
      .from('tenants')
      .select('user_id')
      .eq('id', invoice.tenant_id)
      .single()

    if (tenantUser?.user_id) {
      await dispatchNotification(
        supabase,
        {
          userId: tenantUser.user_id,
          tenantId: invoice.tenant_id,
        },
        {
          title: 'Hóa đơn mới',
          body: `Phòng ${roomCode} có hóa đơn tháng này. Tổng tiền: ${Number(invoice.total_amount).toLocaleString('vi-VN')}đ. Vui lòng thanh toán!`,
          type: 'invoice',
        }
      )
    }

    return { success: true }
  } catch (err: unknown) {
    console.error('Gửi thông báo lỗi:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function updateInvoiceDueDate(
  invoiceId: number,
  dueDate: string
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return { success: false, error: auth.error || 'Chưa xác thực' }
    }

    if (auth.role !== 'super_admin' && auth.role !== 'manager') {
      return { success: false, error: 'Bạn không có quyền thực hiện hành động này' }
    }

    const parsed = new Date(dueDate)
    if (Number.isNaN(parsed.getTime())) {
      return { success: false, error: 'Ngày hết hạn không hợp lệ' }
    }

    const supabase = auth.supabase!

    if (auth.role === 'manager') {
      const access = await assertManagerCanAccessInvoice(supabase, invoiceId, auth.role, auth.branchId)
      if (!access.ok) return { success: false, error: access.error }
    }

    const { error } = await supabase
      .from('invoices')
      .update({ due_date: parsed.toISOString() })
      .eq('id', invoiceId)

    if (error) throw error
    revalidatePath('/invoices')
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function markInvoicePaidManually(
  invoiceId: number,
  method: 'cash' | 'manual' = 'cash'
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return { success: false, error: auth.error || 'Chưa xác thực' }
    }

    if (auth.role !== 'super_admin' && auth.role !== 'manager') {
      return { success: false, error: 'Bạn không có quyền thực hiện hành động này' }
    }

    const supabase = auth.supabase!

    if (auth.role === 'manager') {
      const access = await assertManagerCanAccessInvoice(supabase, invoiceId, auth.role, auth.branchId)
      if (!access.ok) return { success: false, error: access.error }
      if (access.invoice.payment_status === 'paid') {
        return { success: true, alreadyPaid: true }
      }
    }

    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, invoice_code, total_amount, payment_status, tenant_id, tenant:tenant_id(user_id)')
      .eq('id', invoiceId)
      .maybeSingle()

    if (fetchError || !invoice) {
      return { success: false, error: 'Không tìm thấy hóa đơn' }
    }

    if (invoice.payment_status === 'paid') {
      return { success: true, alreadyPaid: true }
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        paid_method: method,
      })
      .eq('id', invoiceId)
      .eq('payment_status', 'unpaid')

    if (updateError) throw updateError

    const tenantData = invoice.tenant as unknown
    const tenantObj = Array.isArray(tenantData)
      ? (tenantData[0] as { user_id?: string } | undefined)
      : (tenantData as { user_id?: string } | null)

    if (tenantObj?.user_id) {
      const methodLabel = method === 'cash' ? 'tiền mặt' : 'thủ công'
      await dispatchNotification(
        supabase,
        { userId: tenantObj.user_id, tenantId: (invoice.tenant_id as number) ?? null },
        {
          title: 'Đã xác nhận thanh toán',
          body: `Hóa đơn ${invoice.invoice_code} số tiền ${Number(invoice.total_amount).toLocaleString('vi-VN')}đ đã được xác nhận thanh toán (${methodLabel}).`,
          type: 'payment',
        }
      )
    }

    revalidatePath('/invoices')
    return { success: true, alreadyPaid: false }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function addInvoiceAction(formData: FormData) {
  const data = {
    room_id: formData.get('room_id'),
    roomPrice: formData.get('roomPrice'),
    serviceCost: formData.get('serviceCost'),
    electricOld: formData.get('electricOld'),
    electricNew: formData.get('electricNew'),
    waterOld: formData.get('waterOld'),
    waterNew: formData.get('waterNew'),
  }

  const parsed = invoiceSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error))
  }

  const {
    room_id: roomId,
    roomPrice,
    serviceCost,
    electricOld,
    electricNew,
    waterOld,
    waterNew,
  } = parsed.data as unknown as {
    room_id: number
    roomPrice: number
    serviceCost: number
    electricOld: number
    electricNew: number
    waterOld: number
    waterNew: number
  }

  let electricCost = 0
  let waterCost = 0

  if (electricNew > 0) {
    electricCost = calculateElectricityCost(electricOld, electricNew)
  }
  if (waterNew > 0) {
    waterCost = calculateWaterCost(waterOld, waterNew)
  }

  const result = await createInvoice({
    room_id: roomId,
    roomPrice,
    serviceCost,
    electricCost,
    waterCost,
    electricOld,
    electricNew,
    waterOld,
    waterNew,
  })

  if (!result.success) {
    throw new Error(result.error)
  }

  revalidatePath('/invoices')
}
