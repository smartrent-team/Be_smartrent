import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'
import { redis } from '@/lib/redis'
import { sendPushNotification } from '@/lib/push'
import { Ratelimit } from '@upstash/ratelimit'

// Cấu hình Rate Limiting: 10 requests / 10 giây
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
})

export async function GET(request: Request) {
  try {
    // Kích hoạt Rate Limiting dựa trên IP Address
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
    const { success, limit, reset, remaining } = await ratelimit.limit(`ratelimit_marketplace_${ip}`)

    if (!success) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: 'Bạn đã truy cập quá nhanh. Vui lòng đợi vài giây rồi thử lại.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString()
          }
        }
      )
    }

    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    const { searchParams } = new URL(request.url)
    const branchIdParam = searchParams.get('branch_id')
    const statusParam = searchParams.get('status')

    // Lấy supabase client có bypass RLS
    const supabase = auth.supabase!

    let query = supabase
      .from('marketplace_posts')
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
      .order('created_at', { ascending: false })

    // Phân quyền theo role
    if (auth.role === 'manager') {
      // Manager chỉ thấy bài trong chi nhánh của họ
      if (!auth.branchId && !branchIdParam) {
        return NextResponse.json({ error: 'Missing branch_id' }, { status: 400 })
      }
      query = query.eq('branch_id', branchIdParam || auth.branchId)
      
      // Nếu có truyền status thì filter, không thì lấy tất cả
      if (statusParam) {
        query = query.eq('status', statusParam)
      }
    } else if (auth.role === 'tenant') {
      // Tenant chỉ thấy bài active trong chi nhánh của họ
      if (!auth.branchId && !branchIdParam) {
        return NextResponse.json({ error: 'Missing branch_id' }, { status: 400 })
      }
      query = query.eq('branch_id', branchIdParam || auth.branchId)
      query = query.eq('status', 'active')
    } else if (auth.role === 'super_admin') {
       // Super admin
       if (!auth.organizationId) {
         return NextResponse.json({ error: 'Tài khoản Super Admin chưa được gán tổ chức' }, { status: 403 })
       }
       const { getOrgBranchIds } = await import('@/lib/rbac')
       const branchIds = await getOrgBranchIds(supabase, auth.organizationId)
       if (!branchIds || branchIds.length === 0) {
         return NextResponse.json({ success: true, docs: [] })
       }

       if (branchIdParam) {
         if (!branchIds.includes(Number(branchIdParam))) {
           return NextResponse.json({ error: 'Chi nhánh không thuộc tổ chức của bạn' }, { status: 403 })
         }
         query = query.eq('branch_id', branchIdParam)
       } else {
         query = query.in('branch_id', branchIds)
       }
       
       if (statusParam) query = query.eq('status', statusParam)
    }

    // 1. Tạo Cache Key duy nhất dựa trên các tham số
    const branchIdsStr = auth.role === 'super_admin' ? 'all' : (branchIdParam || auth.branchId || 'none')
    const cacheKey = `marketplace_list:${auth.role}:${branchIdsStr}:${statusParam || 'all'}`

    // 2. Kiểm tra Redis Cache
    const cachedData = await redis.get(cacheKey)
    if (cachedData) {

      return NextResponse.json({ success: true, docs: cachedData, fromCache: true })
    }



    // 3. Nếu không có cache, truy vấn Database
    const { data, error } = await query

    if (error) throw error

    // Format dữ liệu trả về cho Mobile Flutter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docs = (data || []).map((post: any) => {
      // Vì là mảng hoặc object tùy cách Supabase trả về (to-one relation thường là object, nhưng đôi khi trả mảng nếu không 1-1 strict)
      // Thường tenant_id là FOREIGN KEY nên tenants là object.
      const tenantData = Array.isArray(post.tenants) ? post.tenants[0] : post.tenants;
      const userData = tenantData?.users;
      const roomData = tenantData?.rooms;
      const actualUser = Array.isArray(userData) ? userData[0] : userData;
      const actualRoom = Array.isArray(roomData) ? roomData[0] : roomData;

      const ownerName = actualUser?.full_name || 'Người ẩn danh';
      const ownerPhone = actualUser?.phone || 'Chưa có SĐT';
      const ownerRoom = actualRoom?.room_code || 'Chưa rõ phòng';
      const nameParts = ownerName.trim().split(' ');
      const initial = nameParts.length > 0 ? nameParts[nameParts.length - 1][0].toUpperCase() : 'U';

      return {
        id: post.id,
        branchId: post.branch_id,
        title: post.title,
        description: post.description,
        price: post.price,
        images: (post.images || []).map((img: string) => optimizeCloudinaryUrl(img)),
        status: post.status,
        createdAt: post.created_at,
        ownerName,
        ownerPhone,
        ownerRoom,
        ownerInitial: initial,
      }
    });

    // 4. Lưu kết quả vào Redis với TTL dài (ví dụ: 1 giờ = 3600 giây)
    // Khi có người đăng bài mới, ta sẽ chủ động xóa cache key này.
    await redis.setex(cacheKey, 3600, docs)

    return NextResponse.json({ success: true, docs, fromCache: false })

  } catch (error: unknown) {
    console.error('Error in GET marketplace:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Kích hoạt Rate Limiting dựa trên IP Address (Cho POST: 5 requests / 10s)
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
    const { success, limit, reset, remaining } = await ratelimit.limit(`ratelimit_marketplace_post_${ip}`)

    if (!success) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: 'Bạn đang đăng bài quá nhanh. Vui lòng đợi vài giây rồi thử lại.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString()
          }
        }
      )
    }

    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    // Chỉ tenant mới được tạo bài đăng (hoặc cho manager tạo cũng được tùy specs)
    if (auth.role !== 'tenant' && auth.role !== 'manager') {
      return NextResponse.json({ error: 'Only tenants or managers can post' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, price, images, branch_id } = body

    if (!title || !description || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields (title, description, price)' }, { status: 400 })
    }

    const supabase = auth.supabase!
    
    // Tìm tenant_id tương ứng với dbUserId
    let tenant_id = null
    if (auth.role === 'tenant') {
      const { data: tenantInfo } = await supabase
        .from('tenants')
        .select('id')
        .eq('user_id', auth.dbUserId)
        .single()
      
      if (tenantInfo) tenant_id = tenantInfo.id
    }

    const postData = {
      branch_id: branch_id || auth.branchId,
      tenant_id, // Có thể null nếu manager đăng bài thay mặt
      title,
      description,
      price: Number(price) || 0,
      images: images || [],
      status: 'pending_approval' // Mặc định phải duyệt
    }

    const { data, error } = await supabase
      .from('marketplace_posts')
      .insert([postData])
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

    if (error) throw error

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

    // Xóa Cache để cập nhật ngay lập tức
    try {
      const keys = await redis.keys('marketplace_list:*')
      if (keys.length > 0) {
        await redis.del(...keys)

      }
    } catch (err) {
      console.error('Error clearing cache:', err)
    }

    // GỬI PUSH NOTIFICATION CHO MANAGER
    try {
      if (auth.role === 'tenant') {
        // Tìm các quản lý của chi nhánh này
        const { data: managers } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'manager')
          .eq('branch_id', postData.branch_id)

        if (managers && managers.length > 0) {
          const managerIds = managers.map(m => m.id)
          
          // Lấy token của các quản lý
          const { data: tokens } = await supabase
            .from('device_tokens')
            .select('token')
            .in('user_id', managerIds)

          if (tokens && tokens.length > 0) {
            const notiTitle = '📦 Bài đăng mới trên chợ'
            const notiBody = `Phòng ${ownerRoom} vừa đăng bán: "${title}". Vào duyệt ngay!`
            
            // Bắn thông báo (Không await để không block API)
            tokens.forEach(t => {
              sendPushNotification(t.token, notiTitle, notiBody)
            })
          }
        }
      }
    } catch (pushErr) {
      console.error('Error sending push notification to manager:', pushErr)
    }

    return NextResponse.json({ success: true, doc: formattedDoc })

  } catch (error: unknown) {
    console.error('Error in POST marketplace:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 })
  }
}

