'use server'

import { verifySuperAdmin } from '@/lib/rbac'
import { revalidatePath } from 'next/cache'

const VALID_SERVICE_TYPES = ['fixed', 'metered'] as const
const VALID_BILLING_TYPES = ['per_room', 'per_person', 'per_unit'] as const

export type ServiceType = typeof VALID_SERVICE_TYPES[number]
export type BillingType = typeof VALID_BILLING_TYPES[number]

// ─── Services (danh mục) ───────────────────────────────────────────────────

export async function addService(formData: FormData) {
  const supabase = await verifySuperAdmin()

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const serviceType = (formData.get('service_type') as string) || 'fixed'
  const billingType = (formData.get('billing_type') as string) || 'per_room'

  if (!name || name.trim() === '') throw new Error('Tên dịch vụ là bắt buộc')
  if (!VALID_SERVICE_TYPES.includes(serviceType as ServiceType))
    throw new Error('Loại dịch vụ không hợp lệ')
  if (!VALID_BILLING_TYPES.includes(billingType as BillingType))
    throw new Error('Cách tính tiền không hợp lệ')

  const { error } = await supabase.from('services').insert([
    {
      name: name.trim(),
      description: description ? description.trim() : null,
      service_type: serviceType,
      billing_type: billingType,
    },
  ])

  if (error) {
    console.error('Lỗi khi thêm dịch vụ:', error)
    throw new Error(error.message)
  }

  revalidatePath('/services')
}

export async function editService(id: number, formData: FormData) {
  const supabase = await verifySuperAdmin()

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const serviceType = (formData.get('service_type') as string) || 'fixed'
  const billingType = (formData.get('billing_type') as string) || 'per_room'

  if (!name || name.trim() === '') throw new Error('Tên dịch vụ là bắt buộc')
  if (!VALID_SERVICE_TYPES.includes(serviceType as ServiceType))
    throw new Error('Loại dịch vụ không hợp lệ')
  if (!VALID_BILLING_TYPES.includes(billingType as BillingType))
    throw new Error('Cách tính tiền không hợp lệ')

  const { error } = await supabase
    .from('services')
    .update({
      name: name.trim(),
      description: description ? description.trim() : null,
      service_type: serviceType,
      billing_type: billingType,
    })
    .eq('id', id)

  if (error) {
    console.error('Lỗi khi sửa dịch vụ:', error)
    throw new Error(error.message)
  }

  revalidatePath('/services')
}

export async function deleteService(id: number) {
  const supabase = await verifySuperAdmin()

  await supabase.from('branch_services').delete().eq('service_id', id)

  const { error } = await supabase.from('services').delete().eq('id', id)

  if (error) {
    console.error('Lỗi khi xóa dịch vụ:', error)
    throw new Error(error.message)
  }

  revalidatePath('/services')
}

// ─── Branch Services (giá theo từng chi nhánh) ────────────────────────────

export async function upsertBranchService(data: {
  serviceId: number
  branchId: number
  price: number
  unit: string | null
  isActive: boolean
}) {
  const supabase = await verifySuperAdmin()

  const { error } = await supabase
    .from('branch_services')
    .upsert(
      {
        service_id: data.serviceId,
        branch_id: data.branchId,
        price: data.price,
        unit: data.unit,
        is_active: data.isActive,
      },
      { onConflict: 'service_id,branch_id' }
    )

  if (error) {
    console.error('Lỗi khi cập nhật giá chi nhánh:', error)
    throw new Error(error.message)
  }

  revalidatePath('/services')
}

export async function deleteBranchService(serviceId: number, branchId: number) {
  const supabase = await verifySuperAdmin()

  const { error } = await supabase
    .from('branch_services')
    .delete()
    .eq('service_id', serviceId)
    .eq('branch_id', branchId)

  if (error) {
    console.error('Lỗi khi xóa giá chi nhánh:', error)
    throw new Error(error.message)
  }

  revalidatePath('/services')
}
