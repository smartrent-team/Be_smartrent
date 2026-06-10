import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { optimizeCloudinaryUrl } from '@/infrastructure/cloudinary'
import { redis } from '@/infrastructure/redis'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    // Chỉ manager hoặc super_admin mới được duyệt bài
    if (auth.role !== 'manager' && auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Permission denied. Only managers can approve posts.' }, { status: 403 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing post ID' }, { status: 400 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !['active', 'rejected', 'sold'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be active, rejected, or sold.' }, { status: 400 })
    }

    const supabase = auth.supabase!

    // Cập nhật trạng thái
    const { data, error } = await supabase
      .from('marketplace_posts')
      .update({ status })
      .eq('id', id)
      .select(`
        id,
        branch_id,
        title,
        description,
        price,
        images,
        status,
        created_at,
        updated_at,
        tenants (
          id,
          users (
            id,
            full_name,
            phone
          ),
          rooms (
            id,
            room_code
          )
        )
      `)
      .single()

    if (error) {
      throw error
    }

    const tenantData = Array.isArray(data.tenants) ? data.tenants[0] : data.tenants;
    const userData = tenantData?.users;
    const roomData = tenantData?.rooms;
    const actualUser = Array.isArray(userData) ? userData[0] : userData;
    const actualRoom = Array.isArray(roomData) ? roomData[0] : roomData;

    const ownerName = actualUser?.full_name || 'Người ẩn danh';
    const ownerPhone = actualUser?.phone || 'Chưa có SĐT';
    const ownerRoom = actualRoom?.room_code || 'Chưa rõ phòng';
    const nameParts = ownerName.trim().split(' ');
    const initial = nameParts.length > 0 ? nameParts[nameParts.length - 1][0].toUpperCase() : 'U';

    const formattedDoc = {
      id: data.id,
      branchId: data.branch_id,
      title: data.title,
      description: data.description,
      price: data.price,
      images: (data.images || []).map((img: string) => optimizeCloudinaryUrl(img)),
      status: data.status,
      createdAt: data.created_at,
      ownerName,
      ownerPhone,
      ownerRoom,
      ownerInitial: initial,
    };

    // Xóa Cache để danh sách mới nhất được update
    try {
      const keys = await redis.keys('marketplace_list:*')
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (err) {
      console.error('Error clearing cache on status update:', err)
    }

    return NextResponse.json({ success: true, doc: formattedDoc })

  } catch (error: unknown) {
    console.error('Error in PUT marketplace status:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 })
  }
}


