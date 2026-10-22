import {
  LucideIcon,
  ClipboardList,
  CalendarCheck,
  ShieldAlert,
  Package,
  BadgeCheck
} from 'lucide-react'

export type ModuleStatus = 'active' | 'new' | 'coming_soon'

export type ModuleTone =
  | 'indigo'
  | 'emerald'
  | 'rose'
  | 'sky'
  | 'violet'
  | 'amber'
  | 'slate'

export interface HospitalModule {
  id: string              // Định danh duy nhất ('nursing-report')
  code: string            // Mã nội bộ ('NKDD') - KHÔNG hiển thị trên giao diện người dùng
  label: string           // Tên ngắn theo kiểu câu (sentence case), tối đa 2 dòng
  description?: string    // Chỉ hiện trong tooltip khi hover
  route: string           // Đường dẫn điều hướng
  status: ModuleStatus    // 'active' | 'new' | 'coming_soon'
  order: number           // Thứ tự sắp xếp tăng dần
  tone: ModuleTone        // Màu nhận diện
  icon?: LucideIcon | null
  iconSrc?: string | null // Ảnh thay thế tuỳ biến (ưu tiên cao hơn icon)
  roles?: string[]        // Phân quyền theo vai trò (rỗng = tất cả vai trò)
  enabled?: boolean       // Mặc định true
  badgeCount?: number     // Số lượng thông báo (tuỳ chọn)
}

export interface ToneStyle {
  iconColor: string
  hoverBorder: string
  hoverBg: string
}

export const TONE_STYLES: Record<ModuleTone, ToneStyle> = {
  indigo: {
    iconColor: 'text-[#6B63DE]',
    hoverBorder: 'hover:border-[#6B63DE]',
    hoverBg: 'group-hover:bg-[#F2F2FD]'
  },
  emerald: {
    iconColor: 'text-[#1E9E52]',
    hoverBorder: 'hover:border-[#1E9E52]',
    hoverBg: 'group-hover:bg-[#EAFBF1]'
  },
  rose: {
    iconColor: 'text-[#E11D48]',
    hoverBorder: 'hover:border-[#E11D48]',
    hoverBg: 'group-hover:bg-[#FFF1F2]'
  },
  sky: {
    iconColor: 'text-[#0284C7]',
    hoverBorder: 'hover:border-[#0284C7]',
    hoverBg: 'group-hover:bg-[#F0F9FF]'
  },
  violet: {
    iconColor: 'text-[#8B5CF6]',
    hoverBorder: 'hover:border-[#8B5CF6]',
    hoverBg: 'group-hover:bg-[#F5F3FF]'
  },
  amber: {
    iconColor: 'text-[#D97706]',
    hoverBorder: 'hover:border-[#D97706]',
    hoverBg: 'group-hover:bg-[#FFFBEB]'
  },
  slate: {
    iconColor: 'text-[#64748B]',
    hoverBorder: 'hover:border-[#64748B]',
    hoverBg: 'group-hover:bg-[#F8FAFC]'
  }
}

/**
 * CỜ ĐIỀU KHIỂN BẬT / TẮT (FEATURE FLAG) PHÂN HỆ CHẤM CÔNG & PHÂN CA TRỰC:
 * - false: Khóa phân hệ (Hiển thị "Sắp ra mắt" trên Menu và màn hình thông báo khi truy cập URL).
 * - true:  Mở khóa phân hệ hoạt động bình thường cho toàn bộ các khoa phòng.
 */
export const ATTENDANCE_MODULE_ENABLED = false

/**
 * Danh mục 5 phân hệ khởi tạo chính thức của Bệnh viện Đa khoa Khánh Hội.
 * Cấu trúc hoàn toàn hướng cấu hình (config-driven):
 * Thêm phân hệ mới = thêm 1 object vào mảng này, không cần chỉnh sửa JSX hay CSS.
 */
export const HOSPITAL_MODULES_CONFIG: HospitalModule[] = [
  {
    id: 'nursing-report',
    code: 'NKDD',
    label: 'Báo cáo điều dưỡng',
    description: 'Nhập liệu giao ban 76 chỉ số chuyên môn và tổng hợp số liệu 13 khoa phòng',
    route: '/report',
    status: 'active',
    order: 1,
    tone: 'indigo',
    icon: ClipboardList,
    roles: ['ADMIN', 'BGD', 'KHOA_USER'],
    enabled: true
  },
  {
    id: 'timekeeping',
    code: 'TIME',
    label: 'Chấm công nhân viên',
    description: 'Bảng chấm công tháng, phân ca trực và theo dõi ngày công cán bộ theo khoa',
    route: '/attendance',
    status: ATTENDANCE_MODULE_ENABLED ? 'active' : 'coming_soon',
    order: 2,
    tone: 'emerald',
    icon: CalendarCheck,
    roles: ['ADMIN', 'BGD', 'KHOA_USER'],
    enabled: true
  },
  {
    id: 'medical-incident',
    code: 'INCI',
    label: 'Sự cố y khoa',
    description: 'Báo cáo và xử lý sự cố rủi ro y khoa theo khuyến cáo của Bộ Y Tế',
    route: '/incidents',
    status: 'coming_soon',
    order: 3,
    tone: 'rose',
    icon: ShieldAlert,
    roles: ['ADMIN', 'BGD', 'KHOA_USER'],
    enabled: true
  },
  {
    id: 'consumable-supplies',
    code: 'SUPP',
    label: 'Vật tư tiêu hao',
    description: 'Quản lý cơ số tủ thuốc trực và định mức vật tư y tế tiêu hao khoa phòng',
    route: '/supplies',
    status: 'coming_soon',
    order: 4,
    tone: 'sky',
    icon: Package,
    roles: ['ADMIN', 'BGD', 'KHOA_USER'],
    enabled: true
  },
  {
    id: 'quality-check',
    code: 'QUAL',
    label: 'Kiểm tra chất lượng',
    description: 'Bảng kiểm tra đánh giá quy trình kỹ thuật điều dưỡng theo bộ 83 tiêu chí',
    route: '/quality',
    status: 'coming_soon',
    order: 5,
    tone: 'violet',
    icon: BadgeCheck,
    roles: ['ADMIN', 'BGD', 'KHOA_USER'],
    enabled: true
  }
]
