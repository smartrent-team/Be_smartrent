'use server'

import { verifySuperAdmin } from '@/lib/rbac'
import { revalidatePath } from 'next/cache'

export async function getPaymentConfig() {
  try {
    const supabase = await verifySuperAdmin()
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .maybeSingle()
      
    if (userError || !userData?.organization_id) {
      throw new Error('Không tìm thấy thông tin tổ chức của bạn.')
    }
    
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('payment_bank_bin, payment_account_number, payment_account_name')
      .eq('id', userData.organization_id)
      .single()
      
    if (orgError) throw orgError
    
    return { success: true, data: orgData }
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

    const supabase = await verifySuperAdmin()
    
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .maybeSingle()
      
    if (!userData?.organization_id) {
      throw new Error('Không tìm thấy thông tin tổ chức.')
    }
    
    const { error } = await supabase
      .from('organizations')
      .update({
        payment_bank_bin: bankBin,
        payment_account_number: accountNumber,
        payment_account_name: accountName,
      })
      .eq('id', userData.organization_id)
      
    if (error) throw error
    
    revalidatePath('/settings/payment')
    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, error: errorMessage }
  }
}
