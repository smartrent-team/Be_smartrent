'use server'

import { verifyRole } from '@/lib/rbac'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getPaymentConfig() {
  try {
    const auth = await verifyRole()
    if (auth.error || auth.role !== 'super_admin' || !auth.organizationId) {
      throw new Error('Không tìm thấy thông tin tổ chức của bạn.')
    }
    
    return { success: true, data: {
      payment_bank_bin: auth.orgPaymentConfig?.paymentBankBin,
      payment_account_number: auth.orgPaymentConfig?.paymentAccountNumber,
      payment_account_name: auth.orgPaymentConfig?.paymentAccountName
    }}
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, error: errorMessage }
  }
}

export async function updatePaymentConfig(formData: FormData) {
  try {
    const bankBin = formData.get('bankBin')?.toString() || null
    const accountNumber = formData.get('accountNumber')?.toString() || null
    const accountName = formData.get('accountName')?.toString().toUpperCase() || null

    const auth = await verifyRole()
    if (auth.error || auth.role !== 'super_admin' || !auth.organizationId) {
      throw new Error('Không tìm thấy thông tin tổ chức.')
    }
    
    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
      .from('organizations')
      .update({
        payment_bank_bin: bankBin,
        payment_account_number: accountNumber,
        payment_account_name: accountName,
      })
      .eq('id', auth.organizationId)
      
    if (error) throw error
    
    revalidatePath('/settings/payment')
    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, error: errorMessage }
  }
}
