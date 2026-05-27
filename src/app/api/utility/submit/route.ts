import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Kiểm tra Auth (Bảo vệ API)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Lấy dữ liệu từ Flutter App gửi lên
    const body = await request.json()
    const { roomId, currentElectricity, currentWater, month, year } = body

    if (!roomId || currentElectricity === undefined || currentWater === undefined || !month || !year) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
    }

    // 3. Tìm chỉ số tháng trước để so sánh (Logic thay thế cho FastAPI)
    let previousMonth = month - 1
    let previousYear = year
    if (previousMonth === 0) {
      previousMonth = 12
      previousYear = year - 1
    }

    const { data: previousLog } = await supabase
      .from('utility_logs')
      .select('electricity_index, water_index')
      .eq('room_id', roomId)
      .eq('month', previousMonth)
      .eq('year', previousYear)
      .single()

    const prevElectricity = previousLog?.electricity_index || 0
    const prevWater = previousLog?.water_index || 0

    const electricityUsed = currentElectricity - prevElectricity
    const waterUsed = currentWater - prevWater

    if (electricityUsed < 0 || waterUsed < 0) {
      return NextResponse.json({ error: 'Chỉ số mới không được nhỏ hơn tháng trước' }, { status: 400 })
    }

    // Thuật toán kiểm tra bất thường cơ bản:
    // Nếu dùng nhiều hơn 50% so với tháng trước và > 100 số điện / 10 khối nước
    let hasAnomaly = false
    const anomalyMessages = []

    if (previousLog) {
      // Logic so sánh
      const elecIncrease = electricityUsed - prevElectricity
      if (prevElectricity > 0 && elecIncrease > prevElectricity * 0.5 && electricityUsed > 100) {
        hasAnomaly = true
        anomalyMessages.push('Lượng điện tăng bất thường (>50%).')
      }
      
      const waterIncrease = waterUsed - prevWater
      if (prevWater > 0 && waterIncrease > prevWater * 0.5 && waterUsed > 10) {
        hasAnomaly = true
        anomalyMessages.push('Lượng nước tăng bất thường (>50%).')
      }
    }

    // 4. Lưu dữ liệu vào Supabase
    const { data: newLog, error: insertError } = await supabase
      .from('utility_logs')
      .insert({
        room_id: roomId,
        month,
        year,
        electricity_index: currentElectricity,
        water_index: currentWater
      })
      .select()
      .single()

    if (insertError) throw insertError

    // 5. Trả kết quả về cho Flutter App
    return NextResponse.json({ 
      success: true, 
      data: {
        log: newLog,
        usage: {
          electricity: electricityUsed,
          water: waterUsed
        },
        anomaly: {
          detected: hasAnomaly,
          messages: anomalyMessages
        }
      } 
    })

  } catch (error: unknown) {
    console.error('Error submitting utility logic:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
