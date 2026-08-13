const VN_TIMEZONE = 'Asia/Ho_Chi_Minh'

/** Lấy phần ngày lịch (YYYY-MM-DD) theo múi giờ Việt Nam từ chuỗi ISO/timestamp. */
export function toVietnamDateKey(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('en-CA', { timeZone: VN_TIMEZONE })
}

/** Hiển thị dd/MM/yyyy theo lịch Việt Nam. */
export function formatVietnamDateDisplay(value: string | null | undefined): string | null {
  const key = toVietnamDateKey(value)
  if (!key) return null
  const [year, month, day] = key.split('-')
  return `${day}/${month}/${year}`
}

/** Trích ngày lịch từ input (date picker / dd/MM/yyyy / ISO). */
export function extractCalendarDateKey(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const isoPrefix = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoPrefix) {
    return `${isoPrefix[1]}-${isoPrefix[2]}-${isoPrefix[3]}`
  }

  const slashParts = trimmed.split('/')
  if (slashParts.length === 3) {
    const day = parseInt(slashParts[0], 10)
    const month = parseInt(slashParts[1], 10)
    const year = parseInt(slashParts[2], 10)
    if (
      Number.isFinite(day) &&
      Number.isFinite(month) &&
      Number.isFinite(year) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  return toVietnamDateKey(trimmed)
}

/** Chuyển ngày lịch (từ date picker) sang ISO UTC — 00:00 giờ VN. */
export function normalizeCalendarDateToUtcIso(value: string): string | null {
  const dateKey = extractCalendarDateKey(value)
  if (!dateKey) return null

  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return null

  // 00:00 VN (UTC+7) = 17:00 UTC ngày hôm trước
  return new Date(Date.UTC(year, month - 1, day - 1, 17, 0, 0)).toISOString()
}

/** Ngày hôm nay theo lịch VN → ISO UTC 00:00 VN. */
export function todayVietnamCalendarUtcIso(): string {
  const key = new Date().toLocaleDateString('en-CA', { timeZone: VN_TIMEZONE })
  return normalizeCalendarDateToUtcIso(key)!
}
