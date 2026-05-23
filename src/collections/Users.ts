import type { CollectionConfig, FieldAccess, PayloadRequest, Where } from 'payload'
import { isSuperAdmin, isSuperAdminOrManager } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'phone',
    defaultColumns: ['phone', 'email', 'fullName', 'role', 'branch'],
    group: 'Quản lý người dùng',
  },
  auth: true,
  access: {
    // admin: Chỉ super_admin mới được đăng nhập vào giao diện Web CMS
    admin: ({ req: { user } }) => {
      if (!user) return false
      return (user as any).role === 'super_admin'
    },
    // create: manager có thể tạo tenant, super admin tạo tất cả
    create: async ({ req }) => {
      let user = req.user
      
      // Nếu Payload bị rớt token, ta tự phân tích JWT từ Header
      if (!user) {
        const authHeader = req.headers.get('authorization')
        if (authHeader && authHeader.startsWith('JWT ')) {
          const token = authHeader.replace('JWT ', '')
          try {
            const jwt = require('jsonwebtoken')
            const decoded = jwt.verify(token, req.payload.secret)
            const users = await req.payload.find({ 
              collection: 'users', 
              where: { id: { equals: decoded.id } },
              overrideAccess: true 
            })
            if (users.docs.length > 0) {
              user = users.docs[0]
              req.user = user // Gán ngược lại vào req để các bước sau dùng
            }
          } catch (e) {
            console.error('=> Lỗi xác thực token thủ công:', e.message)
          }
        }
      }

      if (!user) {
        return false
      }

      const role = (user as any).role
      return role === 'super_admin' || role === 'manager'
    },
    // read: manager chỉ thấy tenant thuộc chi nhánh mình hoặc user là chính mình
    read: ({ req: { user } }) => {
      if (!user) return false
      const u = user as any
      if (u.role === 'super_admin') return true
      if (u.role === 'manager') {
        const branchId = typeof u.branch === 'object' ? u.branch?.id : u.branch
        if (!branchId) return { id: { equals: user.id } } as Where // fallback just own user
        return {
          or: [
            { id: { equals: user.id } },
            {
              and: [{ role: { equals: 'tenant' } }, { branch: { equals: branchId } }],
            },
          ],
        } as Where
      }
      // tenant sees only themselves
      return { id: { equals: user.id } } as Where
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      const u = user as any
      if (u.role === 'super_admin') return true
      if (u.role === 'manager') {
        const branchId = typeof u.branch === 'object' ? u.branch?.id : u.branch
        if (!branchId) return { id: { equals: user.id } } as Where
        return {
          or: [
            { id: { equals: user.id } },
            {
              and: [{ role: { equals: 'tenant' } }, { branch: { equals: branchId } }],
            },
          ],
        } as Where
      }
      return { id: { equals: user.id } } as Where
    },
    delete: isSuperAdmin,
  },
  endpoints: [
    {
      path: '/send-otp',
      method: 'post',
      handler: async (req: PayloadRequest) => {
        try {
          const body = typeof req.json === 'function' ? await req.json() : req.data
          const phone = body?.phone
          if (!phone) {
            return Response.json({ error: 'Thiếu số điện thoại' }, { status: 400 })
          }

          const users = await req.payload.find({
            collection: 'users',
            where: { phone: { equals: phone } },
            overrideAccess: true,
          })

          if (users.docs.length === 0) {
            return Response.json(
              { error: 'Tài khoản không tồn tại. Vui lòng liên hệ quản lý để tạo tài khoản.' },
              { status: 404 },
            )
          }

          // Generate 6 digit OTP
          const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

          await req.payload.create({
            collection: 'otp-verifications',
            data: {
              phone,
              otpCode,
              purpose: 'login',
              expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
            },
            overrideAccess: true,
          })

          // TODO: Call SMS provider here. For now, just log it.
          console.log(`\n\n[OTP] Gửi mã ${otpCode} đến SĐT ${phone}\n\n`)

          return Response.json({ message: 'Đã gửi mã OTP' })
        } catch (error) {
          console.error(error)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      },
    },
    {
      path: '/verify-otp',
      method: 'post',
      handler: async (req: PayloadRequest) => {
        try {
          const body = typeof req.json === 'function' ? await req.json() : req.data
          const phone = body?.phone
          const otp = body?.otp
          if (!phone || !otp) {
            return Response.json({ error: 'Thiếu số điện thoại hoặc OTP' }, { status: 400 })
          }

          const otpRecords = await req.payload.find({
            collection: 'otp-verifications',
            where: {
              phone: { equals: phone },
              otpCode: { equals: otp },
              verifiedAt: { exists: false },
            },
            sort: '-createdAt',
            limit: 1,
            overrideAccess: true,
          })

          if (otpRecords.docs.length === 0) {
            return Response.json({ error: 'Mã OTP không hợp lệ' }, { status: 400 })
          }

          const otpRecord = otpRecords.docs[0]
          if (new Date(otpRecord.expiredAt) < new Date()) {
            return Response.json({ error: 'Mã OTP đã hết hạn' }, { status: 400 })
          }

          // Mark as verified
          await req.payload.update({
            collection: 'otp-verifications',
            id: otpRecord.id,
            data: { verifiedAt: new Date().toISOString() },
            overrideAccess: true,
          })

          const users = await req.payload.find({
            collection: 'users',
            where: { phone: { equals: phone } },
            overrideAccess: true,
          })

          const user = users.docs[0]

          const jwt = require('jsonwebtoken')
          const token = jwt.sign(
            { 
              id: String(user.id), 
              collection: 'users',
              email: user.email 
            }, 
            req.payload.secret, 
            {
              expiresIn: '30d',
            }
          )
          console.log('====== DEBUG GENERATE TOKEN ======')
          console.log('Generated Token for ID:', user.id, 'Email:', user.email)

          return Response.json({
            message: 'Đăng nhập thành công',
            token,
            user: {
              id: user.id,
              phone: user.phone,
              role: user.role,
              fullName: user.fullName,
              branch: user.branch,
            },
          })
        } catch (error) {
          console.error(error)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, req, operation }) => {
        if (!data) return data
        // Enforce rules when manager creates a tenant
        if (operation === 'create' && req.user && (req.user as any).role === 'manager') {
          if (data?.role !== 'tenant') {
            throw new Error('Manager chỉ được tạo tài khoản Cư dân (tenant).')
          }
          const managerBranch =
            typeof (req.user as any).branch === 'object'
              ? (req.user as any).branch?.id
              : (req.user as any).branch
          if (String(data?.branch) !== String(managerBranch)) {
            throw new Error('Manager chỉ được gán Cư dân vào chi nhánh của mình.')
          }
        }

        // Auto generate dummy email if not provided, because Payload auth requires it
        if (operation === 'create' && data?.phone && !data?.email) {
          data.email = `${data.phone}@user.local`
        }

        // Random password for dummy users if missing
        if (operation === 'create' && !data?.password) {
          data.password = Math.random().toString(36).slice(-10)
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'phone',
      type: 'text',
      label: 'Số điện thoại',
      unique: true,
      index: true,
    },
    {
      name: 'fullName',
      type: 'text',
      label: 'Họ và tên',
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'tenant',
      required: true,
      saveToJWT: true,
      options: [
        { label: 'Quản trị hệ thống (Super Admin)', value: 'super_admin' },
        { label: 'Quản lý cơ sở (Manager)', value: 'manager' },
        { label: 'Cư dân (Tenant)', value: 'tenant' },
      ],
      access: {
        update: ({ req: { user } }) => !!(user && (user as any).role === 'super_admin'),
      },
    },
    {
      name: 'branch',
      type: 'relationship',
      relationTo: 'branches',
      label: 'Cơ sở quản lý / Thuê',
      saveToJWT: true,
      admin: {
        description: 'Cơ sở mà User này trực thuộc',
      },
    },
  ],
}
