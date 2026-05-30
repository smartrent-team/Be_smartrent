'use server'

import { verifySuperAdmin } from '@/lib/rbac'
import { attachPayOsPaymentToInvoice } from '@/lib/invoice-payment'
import { revalidatePath } from 'next/cache'
import { calculateElectricityCost, calculateWaterCost } from '@/lib/billing'

export async function createInvoice(data: {
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
}, supabaseClient?: any) {
  try {
    const supabase = supabaseClient || await verifySuperAdmin()

    const totalAmount = data.roomPrice + (data.serviceCost || 0) + (data.electricCost || 0) + (data.waterCost || 0)
    
    // 1. Sinh mã hóa đơn (INV-YYYYMM-XXXX) và kiểm tra trùng lặp
    const date = new Date()
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`

    // Chống trùng lặp: Kiểm tra xem phòng này đã có hóa đơn trong tháng chưa
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('room_id', data.room_id)
      .like('invoice_code', `INV-${yearMonth}-%`)
      .maybeSingle()

    if (existingInvoice) {
      throw new Error(`Phòng này đã được tạo hóa đơn trong tháng ${date.getMonth() + 1}/${date.getFullYear()}. Vui lòng kiểm tra lại danh sách Hóa đơn.`)
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
    
    // Tạo bản ghi ban đầu để lấy ID
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
        electric_old: data.electricOld || null,
        electric_new: data.electricNew || null,
        water_old: data.waterOld || null,
        water_new: data.waterNew || null,
        total_amount: totalAmount,
        payment_status: 'unpaid',
        issued_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Gán tenant_id từ phòng nếu chưa có
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

    // 2. Tạo link thanh toán PayOS (không bắt buộc – nếu lỗi vẫn tạo hóa đơn OK)
    let paymentWarning: string | null = null
    let payment: {
      qrPayload: string
      checkoutUrl: string
      amount: number
      invoiceCode: string
      accountNumber: string
      accountName: string
      bankBin: string
      description: string
      expiredAt?: number
    } | null = null

    if (totalAmount > 0 && totalAmount >= 2000) {
      const { payment: pay, warning } = await attachPayOsPaymentToInvoice(supabase, {
        id: invoice.id,
        invoice_code: invoiceCode,
        total_amount: totalAmount,
      })
      if (pay) {
        payment = {
          qrPayload: pay.qrPayload,
          checkoutUrl: pay.checkoutUrl,
          amount: totalAmount,
          invoiceCode,
          accountNumber: pay.accountNumber,
          accountName: pay.accountName,
          bankBin: pay.bankBin,
          description: pay.description,
          expiredAt: pay.expiredAt,
        }
      } else if (warning) {
        console.warn('⚠️ PayOS:', warning)
        paymentWarning = warning
      }
    }

    return { success: true, invoiceId: invoice.id, invoiceCode, paymentWarning, payment, tenantId }
  } catch (error: any) {
    console.error('Lỗi khi tạo hóa đơn:', error)
    let errorMessage = 'Lỗi không xác định'
    if (error) {
      if (typeof error === 'object') {
        errorMessage = error.message || error.details || JSON.stringify(error)
      } else {
        errorMessage = String(error)
      }
    }
    return { success: false, error: errorMessage }
  }
}

import { invoiceSchema, formatZodError } from '@/lib/validations'

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

  const { room_id: roomId, roomPrice, serviceCost, electricOld, electricNew, waterOld, waterNew } = parsed.data as unknown as {
    room_id: number;
    roomPrice: number;
    serviceCost: number;
    electricOld: number;
    electricNew: number;
    waterOld: number;
    waterNew: number;
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
    waterNew
  })

  if (!result.success) {
    throw new Error(result.error)
  }

  revalidatePath('/invoices')
}
