export type AttendanceStatus =
  | 'PRESENT'
  | 'BUSINESS_TRIP'
  | 'STUDY'
  | 'LEAVE'
  | 'SICK'
  | 'MATERNITY'
  | 'ABSENT'
  | 'RESIGNED'

export interface AttendanceStatusMeta {
  code: AttendanceStatus
  symbol: string
  label: string
  shortLabel: string
  description: string
  isWorkDay: boolean // true = tính công bệnh viện; false = trừ công chuẩn (nghỉ/hưởng BHXH)
  badgeColor: string
  cellTextColor: string
  cellBgColor: string
  darkCellTextColor: string
  darkCellBgColor: string
  excelBgHex: string
  excelFontHex: string
}

export const ATTENDANCE_STATUS_META: Record<AttendanceStatus, AttendanceStatusMeta> = {
  PRESENT: {
    code: 'PRESENT',
    symbol: '✓',
    label: 'Có mặt',
    shortLabel: 'Có mặt',
    description: 'Có mặt làm việc bình thường tại khoa phòng',
    isWorkDay: true,
    badgeColor: 'bg-[#EAFBF1] text-[#1E9E52] dark:bg-[#152B1E] dark:text-[#34C759]',
    cellTextColor: 'text-[#1E9E52]',
    cellBgColor: 'bg-white',
    darkCellTextColor: 'dark:text-[#34C759]',
    darkCellBgColor: 'dark:bg-[#18192E]',
    excelBgHex: 'FFFFFF',
    excelFontHex: '1E9E52'
  },
  BUSINESS_TRIP: {
    code: 'BUSINESS_TRIP',
    symbol: 'CT',
    label: 'Công tác',
    shortLabel: 'C.Tác',
    description: 'Đi công tác theo điều động của bệnh viện / SYT (tính công)',
    isWorkDay: true,
    badgeColor: 'bg-[#EFF6FF] text-[#2563EB] dark:bg-[#1E293B] dark:text-[#60A5FA]',
    cellTextColor: 'text-[#2563EB]',
    cellBgColor: 'bg-[#EFF6FF]',
    darkCellTextColor: 'dark:text-[#60A5FA]',
    darkCellBgColor: 'dark:bg-[#1E293B]',
    excelBgHex: 'EFF6FF',
    excelFontHex: '2563EB'
  },
  STUDY: {
    code: 'STUDY',
    symbol: 'H',
    label: 'Đi học',
    shortLabel: 'Học',
    description: 'Đi học tập huấn nâng cao chuyên môn (tính công đào tạo)',
    isWorkDay: true,
    badgeColor: 'bg-[#F5F3FF] text-[#7C3AED] dark:bg-[#2E1065] dark:text-[#A78BFA]',
    cellTextColor: 'text-[#7C3AED]',
    cellBgColor: 'bg-[#F5F3FF]',
    darkCellTextColor: 'dark:text-[#A78BFA]',
    darkCellBgColor: 'dark:bg-[#2E1065]',
    excelBgHex: 'F5F3FF',
    excelFontHex: '7C3AED'
  },
  LEAVE: {
    code: 'LEAVE',
    symbol: 'P',
    label: 'Nghỉ phép',
    shortLabel: 'Phép',
    description: 'Nghỉ phép năm hoặc việc riêng theo đơn đề nghị',
    isWorkDay: false,
    badgeColor: 'bg-[#FFF8E6] text-[#B7791F] dark:bg-[#2D2616] dark:text-[#E0A838]',
    cellTextColor: 'text-[#B7791F]',
    cellBgColor: 'bg-[#FFF8E6]',
    darkCellTextColor: 'dark:text-[#E0A838]',
    darkCellBgColor: 'dark:bg-[#2D2616]',
    excelBgHex: 'FFF8E6',
    excelFontHex: 'B7791F'
  },
  SICK: {
    code: 'SICK',
    symbol: 'Ô',
    label: 'Ốm đau',
    shortLabel: 'Ốm',
    description: 'Nghỉ ốm đau có xác nhận của y tế (hưởng chế độ BHXH)',
    isWorkDay: false,
    badgeColor: 'bg-[#FFF7ED] text-[#EA580C] dark:bg-[#431407] dark:text-[#FB923C]',
    cellTextColor: 'text-[#EA580C]',
    cellBgColor: 'bg-[#FFF7ED]',
    darkCellTextColor: 'dark:text-[#FB923C]',
    darkCellBgColor: 'dark:bg-[#431407]',
    excelBgHex: 'FFF7ED',
    excelFontHex: 'EA580C'
  },
  MATERNITY: {
    code: 'MATERNITY',
    symbol: 'TS',
    label: 'Nghỉ thai sản',
    shortLabel: 'Thai sản',
    description: 'Nghỉ chế độ thai sản theo quy định Bảo hiểm Xã hội',
    isWorkDay: false,
    badgeColor: 'bg-[#FDF2F8] text-[#DB2777] dark:bg-[#500724] dark:text-[#F472B6]',
    cellTextColor: 'text-[#DB2777]',
    cellBgColor: 'bg-[#FDF2F8]',
    darkCellTextColor: 'dark:text-[#F472B6]',
    darkCellBgColor: 'dark:bg-[#500724]',
    excelBgHex: 'FDF2F8',
    excelFontHex: 'DB2777'
  },
  ABSENT: {
    code: 'ABSENT',
    symbol: 'V',
    label: 'Vắng không phép',
    shortLabel: 'Vắng',
    description: 'Vắng mặt không báo trước, không được phê duyệt',
    isWorkDay: false,
    badgeColor: 'bg-[#FDECEC] text-[#C53030] dark:bg-[#3D1E24] dark:text-[#FF6B6B]',
    cellTextColor: 'text-[#C53030]',
    cellBgColor: 'bg-[#FDECEC]',
    darkCellTextColor: 'dark:text-[#FF6B6B]',
    darkCellBgColor: 'dark:bg-[#3D1E24]',
    excelBgHex: 'FDECEC',
    excelFontHex: 'C53030'
  },
  RESIGNED: {
    code: 'RESIGNED',
    symbol: '-',
    label: 'Đã thôi việc',
    shortLabel: 'Thôi việc',
    description: 'Đã chấm dứt HĐLĐ / thôi việc (sau ngày nghỉ việc, không tính công, không tính vắng)',
    isWorkDay: false,
    badgeColor: 'bg-[#F0F1F9] text-[#8A8BA0] dark:bg-[#1E2038] dark:text-[#6C6F93]',
    cellTextColor: 'text-[#8A8BA0]',
    cellBgColor: 'bg-[#F6F7FB]',
    darkCellTextColor: 'dark:text-[#6C6F93]',
    darkCellBgColor: 'dark:bg-[#1E2038]',
    excelBgHex: 'F2F2F2',
    excelFontHex: '888888'
  }
}

// Thứ tự xoay vòng khi nhấp chuột liên tiếp
export const ATTENDANCE_CYCLE_ORDER: AttendanceStatus[] = [
  'PRESENT',       // ✓ Có mặt
  'BUSINESS_TRIP', // CT Công tác
  'STUDY',         // H Đi học
  'LEAVE',         // P Phép
  'SICK',          // Ô Nghỉ ốm
  'MATERNITY',     // TS Thai sản
  'ABSENT'         // V Vắng
]

export const ATTENDANCE_STATUS_ORDER = ATTENDANCE_CYCLE_ORDER

export const ATTENDANCE_STATUS_KEYS = Object.keys(ATTENDANCE_STATUS_META) as AttendanceStatus[]
