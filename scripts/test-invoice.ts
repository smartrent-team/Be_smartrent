import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

async function runTest() {
  console.log('🚀 Đang khởi động Payload CMS...')
  const payload = await getPayload({ config: configPromise })

  try {
    console.log('\n--- BƯỚC 1: Tạo Dữ Liệu Mẫu (Mock Data) ---')
    
    // 1. Tạo Cơ sở
    const branch = await payload.create({
      collection: 'branches',
      data: {
        name: 'Chi nhánh Test Tự Động',
      },
    })
    console.log(`✅ Đã tạo cơ sở: ${branch.name}`)

    // 2. Tạo Phòng
    const room = await payload.create({
      collection: 'rooms',
      data: {
        roomCode: 'P-999',
        branch: branch.id,
        basePrice: 3000000, // Giá phòng 3 củ
        status: 'available'
      },
    })
    console.log(`✅ Đã tạo phòng: ${room.roomCode} (Giá: 3.000.000đ)`)

    // 3. Tạo một User rác để gán cho Tenant (bắt buộc)
    const mockUser = await payload.create({
      collection: 'users',
      data: {
        email: `test_auto_invoice_${Date.now()}@example.com`,
        password: 'password123',
        fullName: 'Nguyễn Văn Test',
        role: 'tenant',
      },
    })
    console.log(`✅ Đã tạo User ảo`)

    // 4. Tạo Cư dân
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        user: mockUser.id,
        identityNumber: '001201012345',
        room: room.id,
        moveInDate: new Date().toISOString(),
      },
    })
    console.log(`✅ Đã tạo Cư dân:`, tenant.id)

    // 5. Tạo Hợp đồng
    const contract = await payload.create({
      collection: 'contracts',
      data: {
        contractCode: 'HD-999',
        tenant: tenant.id,
        room: room.id,
        startDate: new Date().toISOString(),
        status: 'active'
      },
    })
    console.log(`✅ Đã tạo Hợp đồng thuê phòng (Trạng thái Active)`)

    console.log('\n--- BƯỚC 2: QUẢN LÝ CHỐT ĐIỆN NƯỚC (KÍCH HOẠT AUTO) ---')
    // Giả lập cuối tháng quản lý đi ghi chỉ số điện nước
    const utility = await payload.create({
      collection: 'utility-logs',
      data: {
        room: room.id,
        month: 10,
        year: 2026,
        electricOld: 100,
        electricNew: 150, // Dùng 50 số điện (50 * 3k8 = 190.000đ)
        waterOld: 20,
        waterNew: 25,     // Dùng 5 khối nước (5 * 30k = 150.000đ)
      },
    })
    console.log(`✅ Đã chốt số tháng 10: Dùng 50 chữ điện, 5 khối nước`)

    console.log('\n--- BƯỚC 3: KIỂM TRA HÓA ĐƠN ĐƯỢC TỰ ĐỘNG SINH RA ---')
    // Truy vấn hóa đơn mới nhất vừa được tạo ra cho phòng này
    const invoices = await payload.find({
      collection: 'invoices',
      where: {
        room: { equals: room.id }
      },
      sort: '-createdAt'
    })

    if (invoices.docs.length > 0) {
      const invoice = invoices.docs[0]
      console.log('🎉 TÌM THẤY HÓA ĐƠN TỰ ĐỘNG!')
      console.log('Mã hóa đơn:', invoice.invoiceCode)
      console.log('Tiền thuê phòng:', invoice.roomPrice?.toLocaleString('vi-VN'), 'VNĐ')
      console.log('Tiền điện (50x3k8):', invoice.electricCost?.toLocaleString('vi-VN'), 'VNĐ')
      console.log('Tiền nước (5x30k):', invoice.waterCost?.toLocaleString('vi-VN'), 'VNĐ')
      console.log('>>> TỔNG THANH TOÁN:', invoice.totalAmount?.toLocaleString('vi-VN'), 'VNĐ')
      console.log('Trạng thái thanh toán:', invoice.paymentStatus)
    } else {
      console.log('❌ Lỗi: Không tìm thấy hóa đơn nào được sinh ra!')
    }

  } catch (error) {
    console.error('Lỗi trong quá trình test:', error)
  }

  process.exit(0)
}

runTest()
