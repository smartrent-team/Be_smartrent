import { Access } from 'payload'
import { User } from '../payload-types'

export const isAdminOrLandlord: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'landlord') return true
  return false
}

export const isTenant: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'tenant') return true
  return false
}

export const tenantOwnsData: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'landlord') return true

  return {
    tenant: {
      equals: user.id,
    },
  }
}
