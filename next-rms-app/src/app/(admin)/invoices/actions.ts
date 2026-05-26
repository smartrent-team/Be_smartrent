'use server'

import { createClient } from '@/lib/supabase/server'
import { payos } from '@/lib/payos'
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
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    const totalAmount = data.roomPrice + (data.serviceCost || 0) + (data.electricCost || 0) + (data.waterCost || 0)
    
    // 1. Sinh mã hóa đơn (INV-YYYYMM-XXXX)
    const date = new Date()
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`

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

    // 2. Tạo link thanh toán PayOS
    if (totalAmount > 0) {
      if (totalAmount < 2000) {
        throw new Error('Số tiền thanh toán tối thiểu qua cổng PayOS là 2,000đ')
      }

      const returnUrl = process.env.PAYOS_RETURN_URL || 'http://localhost:3000/payment-success'
      const cancelUrl = process.env.PAYOS_CANCEL_URL || 'http://localhost:3000/payment-cancel'

      // Tạo orderCode độc nhất dựa trên timestamp + ID hóa đơn để tránh trùng lặp trên cổng PayOS
      const uniqueOrderCode = Number(Date.now().toString().slice(-6) + String(invoice.id % 1000).padStart(3, '0'))

      const paymentLink = await payos.createPaymentLink({
        orderCode: uniqueOrderCode,
        amount: totalAmount,
        description: `TT Phong ${data.room_id}`,
        returnUrl,
        cancelUrl,
      })

      // Cập nhật lại invoice với ID link thanh toán và link checkout
      await supabase
        .from('invoices')
        .update({
          payment_link_id: paymentLink.paymentLinkId,
          checkoutUrl: paymentLink.checkoutUrl,
          qrPayload: paymentLink.qrCode,
        })
        .eq('id', invoice.id)
    }

    return { success: true, invoiceId: invoice.id }
  } catch (error: unknown) {
    console.error('Lỗi khi tạo hóa đơn:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
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
