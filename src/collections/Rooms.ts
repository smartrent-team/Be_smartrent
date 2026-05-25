import { CollectionConfig, PayloadRequest } from 'payload'
import jwt from 'jsonwebtoken'
import { isSuperAdmin, isSuperAdminOrManager, managerOwnsData } from '../access'

const getHeaderValue = (req: PayloadRequest, name: string): string | undefined => {
  const headers = req.headers as Headers | Record<string, string | string[] | undefined> | undefined

  if (!headers) return undefined

  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name) ?? undefined
  }

  const headerMap = headers as Record<string, string | string[] | undefined>
  const value = headerMap[name] ?? headerMap[name.toLowerCase()]

  if (Array.isArray(value)) return value[0]
  return typeof value === 'string' ? value : undefined
}

const normalizeRelationId = (value: unknown): string | number | undefined => {
  if (value == null) return undefined

  if (typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
    return (value as { id?: string | number }).id
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  return undefined
}

const loadUserById = async (req: PayloadRequest, id: string | number | undefined) => {
  if (id == null) return undefined

  const users = await req.payload.find({
    collection: 'users',
    where: { id: { equals: id } },
    overrideAccess: true,
    limit: 1,
  })

  if (users.docs.isEmpty) return undefined

  req.user = users.docs[0] as any
  return users.docs[0]
}

const resolveRequestUser = async (req: PayloadRequest) => {
  const requestUser = req.user as any

  if (requestUser?.id != null) {
    const hydratedUser = await loadUserById(req, requestUser.id)
    if (hydratedUser != null) return hydratedUser
  }

  const authHeader = getHeaderValue(req, 'authorization')
  if (!authHeader?.startsWith('JWT ')) return undefined

  try {
    const token = authHeader.replace('JWT ', '')
    const decoded = (jwt as any).verify(token, req.payload.secret)
    return await loadUserById(req, decoded.id)
  } catch (error: any) {
    console.error('=> Token verification failed in /rooms/list:', error.message)
    return undefined
  }
}

const buildRoomResponse = async (req: PayloadRequest, room: any) => {
  let tenant: Record<string, unknown> | null = null

  const tenantResult = await req.payload.find({
    collection: 'tenants',
    where: {
      and: [
        { room: { equals: room.id } },
        { moveOutDate: { exists: false } },
      ],
    },
    depth: 1,
    limit: 1,
    overrideAccess: true,
  })

  if (tenantResult.docs.isNotEmpty) {
    const tenantProfile = tenantResult.docs[0] as any
    const tenantUser = tenantProfile.user as any

    tenant = {
      id: tenantProfile.id,
      identityNumber: tenantProfile.identityNumber ?? null,
      emergencyContact: tenantProfile.emergencyContact ?? null,
      moveInDate: tenantProfile.moveInDate ?? null,
      moveOutDate: tenantProfile.moveOutDate ?? null,
      user: tenantUser
        ? {
            id: tenantUser.id,
            fullName: tenantUser.fullName ?? null,
            phone: tenantUser.phone ?? null,
          }
        : null,
    }
  }

  return {
    id: room.id,
    roomCode: room.roomCode,
    floor: room.floor,
    area: room.area,
    basePrice: room.basePrice,
    electricPrice: room.electricPrice,
    waterPrice: room.waterPrice,
    status: room.status,
    branch: room.branch,
    tenant,
  }
}

export const Rooms: CollectionConfig = {
  slug: 'rooms',
  admin: {
    useAsTitle: 'roomCode',
    defaultColumns: ['roomCode', 'branch', 'basePrice', 'status'],
    group: 'Quan ly co so',
  },
  access: {
    read: managerOwnsData('branch'),
    create: isSuperAdminOrManager,
    update: managerOwnsData('branch'),
    delete: isSuperAdmin,
  },
  endpoints: [
    {
      path: '/list',
      method: 'get',
      handler: async (req: PayloadRequest) => {
        try {
          const user = await resolveRequestUser(req)
          const { searchParams } = new URL(req.url || '', 'http://localhost')
          const branchParam = searchParams.get('branch')
          const searchParam = searchParams.get('search')
          const statusParam = searchParams.get('status')
          const floorParam = searchParams.get('floor')
          const pageParam = Number.parseInt(searchParams.get('page') ?? '', 10)
          const limitParam = Number.parseInt(searchParams.get('limit') ?? '', 10)
          const page = Number.isFinite(pageParam) ? Math.max(pageParam, 1) : 1
          const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 100
          const whereConditions: Record<string, unknown>[] = []

          if (user) {
            const currentUser = user as any
            const branchId = normalizeRelationId(currentUser.branch)

            if (currentUser.role === 'manager' || currentUser.role === 'tenant') {
              if (branchId == null) {
                return Response.json(
                  { error: 'Manager chua duoc gan vao chi nhanh nao' },
                  { status: 403 },
                )
              }

              whereConditions.push({
                branch: { equals: branchId },
              })
            }

            if (branchParam && currentUser.role === 'super_admin') {
              whereConditions.push({
                branch: { equals: branchParam },
              })
            }
          } else {
            whereConditions.push({
              status: { equals: 'available' },
            })

            if (branchParam) {
              whereConditions.push({
                branch: { equals: branchParam },
              })
            }
          }

          if (statusParam) {
            whereConditions.push({
              status: { equals: statusParam },
            })
          }

          if (searchParam) {
            whereConditions.push({
              roomCode: { like: searchParam },
            })
          }

          if (floorParam) {
            const floorNum = Number.parseInt(floorParam, 10)
            if (!Number.isNaN(floorNum)) {
              whereConditions.push({
                floor: { equals: floorNum },
              })
            }
          }

          const roomsResult = await req.payload.find({
            collection: 'rooms',
            where: whereConditions.isNotEmpty ? { and: whereConditions } : undefined,
            depth: 1,
            limit,
            page,
            overrideAccess: true,
          })

          const docs = await Promise.all(roomsResult.docs.map((room) => buildRoomResponse(req, room)))

          return Response.json({
            success: true,
            docs,
            totalDocs: roomsResult.totalDocs,
            limit: roomsResult.limit,
            totalPages: roomsResult.totalPages,
            page: roomsResult.page,
            hasPrevPage: roomsResult.hasPrevPage,
            hasNextPage: roomsResult.hasNextPage,
            prevPage: roomsResult.prevPage,
            nextPage: roomsResult.nextPage,
          })
        } catch (error: any) {
          console.error('Error fetching rooms:', error)
          return Response.json(
            { error: 'Loi may chu noi bo', details: error.message },
            { status: 500 },
          )
        }
      },
    },
    {
      path: '/detail',
      method: 'get',
      handler: async (req: PayloadRequest) => {
        try {
          const user = await resolveRequestUser(req)
          const { searchParams } = new URL(req.url || '', 'http://localhost')
          const idParam = searchParams.get('id')
          const roomId = idParam ? Number.parseInt(idParam, 10) : Number.NaN

          if (Number.isNaN(roomId)) {
            return Response.json({ error: 'Thieu id phong hop le' }, { status: 400 })
          }

          const room = await req.payload.findByID({
            collection: 'rooms',
            id: roomId,
            depth: 1,
            overrideAccess: true,
          })

          if (!room) {
            return Response.json({ error: 'Khong tim thay phong' }, { status: 404 })
          }

          if (user) {
            const currentUser = user as any
            const currentBranchId = normalizeRelationId(currentUser.branch)
            const roomBranchId = normalizeRelationId(room.branch)

            if (
              (currentUser.role === 'manager' || currentUser.role === 'tenant') &&
              currentBranchId != null &&
              roomBranchId != null &&
              String(currentBranchId) != String(roomBranchId)
            ) {
              return Response.json({ error: 'Ban khong co quyen xem phong nay' }, { status: 403 })
            }
          }

          const doc = await buildRoomResponse(req, room)

          return Response.json({
            success: true,
            doc,
          })
        } catch (error: any) {
          console.error('Error fetching room detail:', error)
          return Response.json(
            { error: 'Loi may chu noi bo', details: error.message },
            { status: 500 },
          )
        }
      },
    },
  ],
  fields: [
    {
      name: 'branch',
      type: 'relationship',
      relationTo: 'branches',
      required: true,
      label: 'Co so',
      admin: {
        description: 'Co so chua phong nay',
      },
    },
    {
      name: 'roomCode',
      type: 'text',
      required: true,
      label: 'Ma phong',
    },
    {
      name: 'floor',
      type: 'number',
      label: 'Tang',
    },
    {
      name: 'area',
      type: 'number',
      label: 'Dien tich (m2)',
    },
    {
      name: 'basePrice',
      type: 'number',
      required: true,
      label: 'Gia thue co ban',
    },
    {
      name: 'electricPrice',
      type: 'number',
      label: 'Don gia dien (d/kWh)',
    },
    {
      name: 'waterPrice',
      type: 'number',
      label: 'Don gia nuoc (d/khoi)',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Trong', value: 'available' },
        { label: 'Da thue', value: 'occupied' },
        { label: 'Bao tri', value: 'maintenance' },
      ],
      defaultValue: 'available',
      label: 'Trang thai',
    },
  ],
}
