import { Access, Where } from 'payload'

// ============================================================
// RBAC — Role-Based Access Control cho hệ thống quản lý nhà trọ
// Tầng này bảo vệ Payload REST/GraphQL API.
// RLS ở PostgreSQL là tầng bảo vệ thứ hai (defense in depth).
// ============================================================

// ---- Kiểm tra vai trò cơ bản ----

/** Chỉ cho phép super_admin */
export const isSuperAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  return (user as any).role === 'super_admin'
}

/** Cho phép super_admin hoặc manager */
export const isSuperAdminOrManager: Access = ({ req: { user } }) => {
  if (!user) return false
  return (user as any).role === 'super_admin' || (user as any).role === 'manager'
}

/** Cho phép tenant */
export const isTenant: Access = ({ req: { user } }) => {
  if (!user) return false
  return (user as any).role === 'tenant'
}

// ---- Lọc dữ liệu theo branch_id ----

/**
 * managerOwnsData(branchField)
 * Trả về Access function lọc dữ liệu theo branch:
 *   - super_admin: thấy tất cả (return true)
 *   - manager: chỉ thấy dữ liệu có branchField khớp với branch của mình
 *   - tenant & unauthenticated: bị từ chối (return false)
 *
 * @param branchField - tên trường relationship đến 'branches' trong collection
 */
export const managerOwnsData =
  (branchField: string = 'branch'): Access =>
  ({ req: { user } }) => {
    if (!user) return false
    const u = user as any

    // super_admin thấy tất cả
    if (u.role === 'super_admin') return true

    // manager chỉ thấy dữ liệu thuộc branch của mình
    if (u.role === 'manager') {
      const branchId = typeof u.branch === 'object' ? u.branch?.id : u.branch
      if (!branchId) return false
      return {
        [branchField]: {
          equals: branchId,
        },
      } as Where
    }

    return false
  }

// ---- Tenant tự xem dữ liệu của mình ----

/**
 * tenantOwnsData
 * Dùng cho Invoices, Contracts, MaintenanceTickets:
 *   - super_admin / manager: thấy tất cả dữ liệu thuộc branch của mình
 *   - tenant: chỉ thấy dòng có trường `tenant` (relationship) khớp với id của mình
 */
export const tenantOwnsData: Access = ({ req: { user } }) => {
  if (!user) return false
  const u = user as any

  if (u.role === 'super_admin') return true

  if (u.role === 'manager') {
    const branchId = typeof u.branch === 'object' ? u.branch?.id : u.branch
    if (!branchId) return false
    return {
      branch: { equals: branchId },
    } as Where
  }

  if (u.role === 'tenant') {
    return {
      tenant: { equals: user.id },
    } as Where
  }

  return false
}

// ---- (Giữ tương thích ngược nếu cần) ----

/** @deprecated Dùng isSuperAdminOrManager thay thế */
export const isAdminOrLandlord: Access = ({ req: { user } }) => {
  if (!user) return false
  return (user as any).role === 'super_admin' || (user as any).role === 'manager'
}
