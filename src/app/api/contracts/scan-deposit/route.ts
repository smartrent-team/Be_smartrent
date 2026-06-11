import { NextResponse, type NextRequest } from 'next/server'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Thiếu file ảnh hợp đồng' }, { status: 400 })
    }

    // Forward file to AI service
    const aiFormData = new FormData()
    aiFormData.append('file', file)

    const aiResponse = await fetch(`${AI_SERVICE_URL}/contract/scan-deposit`, {
      method: 'POST',
      body: aiFormData,
    })

    const aiData = await aiResponse.json()

    if (!aiResponse.ok) {
      // AI service trả về lỗi có cấu trúc trong detail
      const detail = aiData.detail || aiData
      return NextResponse.json(
        {
          success: false,
          error: detail.error || 'Không thể quét tiền cọc từ ảnh',
          data: detail.data || null,
        },
        { status: aiResponse.status }
      )
    }

    return NextResponse.json(aiData)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('scan-deposit proxy error:', error)
    return NextResponse.json(
      { success: false, error: 'Lỗi kết nối đến dịch vụ AI: ' + errorMessage, data: null },
      { status: 502 }
    )
  }
}
