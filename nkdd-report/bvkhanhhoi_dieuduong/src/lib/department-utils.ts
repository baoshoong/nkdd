/**
 * Tiện ích chuẩn hóa và viết tắt tên khoa phòng bệnh viện
 * Đảm bảo hiển thị ngắn gọn nhất trên Dashboard, Bảng báo cáo ma trận và Thống kê
 */

export function getShortDeptName(code?: string | null, fallbackName?: string): string {
  if (!code) return fallbackName || ''
  switch (code.trim().toUpperCase()) {
    case 'NOI':
      return 'K. Nội'
    case 'NGOAI':
      return 'K. Ngoại'
    case 'SAN':
      return 'K. Sản'
    case 'NHI':
      return 'K. Nhi'
    case 'KKB':
      return 'K. Khám'
    case 'CC':
      return 'Cấp cứu'
    case 'TNT':
      return 'Thận NT'
    case 'LCK':
      return 'Liên CK'
    case 'GMHS':
      return 'GMHS'
    case 'XN':
      return 'Xét nghiệm'
    case 'CDHA':
      return 'CĐHA'
    case 'YHCT':
      return 'K. YHCT'
    case 'TONG':
      return 'TỔNG'
    default:
      return fallbackName || code
  }
}
