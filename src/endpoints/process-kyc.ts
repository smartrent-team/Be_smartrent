import { PayloadHandler } from 'payload'

export const processKYC: PayloadHandler = async (req) => {
  try {
    // 1. Kiểm tra quyền truy cập (Optional, tùy thuộc vào requirement)
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Nhận dữ liệu từ request (Flutter gửi ảnh)
    if (!req.formData) {
      return Response.json({ error: 'FormData is not supported on this request' }, { status: 400 })
    }
    const formData = await req.formData()

    const file = formData.get('file')

    if (!file) {
      return Response.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // 3. Proxy sang FastAPI AI OCR Service
    // Giả sử FastAPI chạy tại http://localhost:8001/ocr
    const ocrServiceUrl = process.env.AI_OCR_SERVICE_URL || 'http://localhost:8001/ocr'
    
    const fastApiFormData = new FormData()
    fastApiFormData.append('file', file)

    const response = await fetch(ocrServiceUrl, {
      method: 'POST',
      body: fastApiFormData,
    })

    if (!response.ok) {
      throw new Error('OCR Service failed')
    }

    const extractionResult = await response.json()

    // 4. Trả kết quả về cho Mobile App
    return Response.json(extractionResult)
  } catch (error) {
    console.error('OCR Proxy Error:', error)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
