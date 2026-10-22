/**
 * Tiện ích định dạng ngày giờ theo múi giờ Hồ Chí Minh (Asia/Ho_Chi_Minh - UTC+7)
 * và chuẩn rút gọn 2 chữ số năm: dd/MM/yy (ví dụ: 12/10/26)
 */

export const TIMEZONE_HCM = 'Asia/Ho_Chi_Minh'

/**
 * Chuyển đổi Date hoặc chuỗi ngày sang dd/MM/yy
 * Ví dụ: 2026-10-12 -> "12/10/26"
 */
export function formatDateShort(dateInput: Date | string | number): string {
  if (!dateInput) return ''
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return ''

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE_HCM,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  })

  return formatter.format(date)
}

/**
 * Chuyển đổi Date hoặc chuỗi ngày sang dd/MM/yyyy
 * Ví dụ: 2026-10-12 -> "12/10/2026"
 */
export function formatDateFull(dateInput: Date | string | number): string {
  if (!dateInput) return ''
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return ''

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE_HCM,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  return formatter.format(date)
}

/**
 * Chuyển đổi Date hoặc chuỗi ngày giờ sang HH:mm:ss dd/MM/yyyy theo múi giờ Hồ Chí Minh
 * Ví dụ: "09:35:12 12/10/2026"
 */
export function formatDateTimeWithSeconds(dateInput: Date | string | number = new Date()): string {
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return ''

  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE_HCM,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE_HCM,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  return `${timeFormatter.format(date)} ${dateFormatter.format(date)}`
}

/**
 * Chuyển đổi Date sang HH:mm dd/MM/yy (không kèm giây)
 */
export function formatDateTimeShort(dateInput: Date | string | number): string {
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return ''

  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE_HCM,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE_HCM,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  })

  return `${timeFormatter.format(date)} ${dateFormatter.format(date)}`
}

/**
 * Lấy chuỗi ngày hôm nay YYYY-MM-DD theo múi giờ Hồ Chí Minh (UTC+7)
 * Ví dụ: "2026-10-12"
 */
export function getTodayHCM(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_HCM,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(new Date())
}
