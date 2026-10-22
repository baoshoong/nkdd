export type ModuleStatus = 'active' | 'beta' | 'coming_soon'
export type UserRole = 'ADMIN' | 'BGD' | 'KHOA_USER'

export interface AppModule {
  id: string
  title: string
  shortTitle: string
  description: string
  iconName: 'ClipboardList' | 'CalendarCheck2' | 'ShieldAlert' | 'Package' | 'Sparkles' | 'BarChart3' | 'Users' | 'Shield'
  href: string
  category: 'clinical' | 'hr' | 'operations' | 'admin'
  categoryLabel: string
  badge?: string
  status: ModuleStatus
  roles?: UserRole[]
  statsInfo?: string
  theme: {
    accentColor: string
    bgGradient: string
    iconBg: string
    iconColor: string
    badgeBg: string
    badgeText: string
  }
}

/**
 * Danh mục các phân hệ chức năng của Bệnh viện Đa khoa Khánh Hội.
 * Để thêm chức năng mới trong tương lai, chỉ cần bổ sung 1 object vào mảng này.
 */
export const HOSPITAL_MODULES: AppModule[] = [
  {
    id: 'nkdd-report',
    title: 'Báo Cáo Điều Dưỡng (NKDD)',
    shortTitle: 'Báo Cáo Điều Dưỡng',
    description: 'Hệ thống nhập liệu giao ban 76 chỉ số chuyên môn, tổng hợp ma trận 13 khoa phòng và xuất báo cáo chuẩn.',
    iconName: 'ClipboardList',
    href: '/report',
    category: 'clinical',
    categoryLabel: 'Chuyên môn Điều dưỡng',
    badge: 'Chính thức',
    status: 'active',
    roles: ['ADMIN', 'BGD', 'KHOA_USER'],
    statsInfo: '76 chỉ số • 13 khoa phòng',
    theme: {
      accentColor: '#6B63DE',
      bgGradient: 'from-[#6B63DE]/10 via-[#6B63DE]/5 to-transparent',
      iconBg: 'bg-[#F2F2FD]',
      iconColor: 'text-[#6B63DE]',
      badgeBg: 'bg-[#6B63DE]/10',
      badgeText: 'text-[#6B63DE]'
    }
  },
  {
    id: 'timesheet',
    title: 'Chấm Công & Phân Ca Trực',
    shortTitle: 'Chấm Công & Ca Trực',
    description: 'Quản lý lịch phân ca (Sáng, Chiều, Đêm, Trực 24h), chấm công ngày theo khoa phòng và thống kê ngày công.',
    iconName: 'CalendarCheck2',
    href: '/timesheet',
    category: 'hr',
    categoryLabel: 'Nhân sự & Chấm công',
    badge: 'Mới ra mắt',
    status: 'active',
    roles: ['ADMIN', 'BGD', 'KHOA_USER'],
    statsInfo: 'Theo dõi ca trực tháng',
    theme: {
      accentColor: '#1E9E52',
      bgGradient: 'from-[#1E9E52]/10 via-[#1E9E52]/5 to-transparent',
      iconBg: 'bg-[#EAFBF1]',
      iconColor: 'text-[#1E9E52]',
      badgeBg: 'bg-[#EAFBF1]',
      badgeText: 'text-[#1E9E52]'
    }
  },
  {
    id: 'statistics',
    title: 'Thống Kê Kỳ & Phân Tích',
    shortTitle: 'Thống Kê & Phân Tích',
    description: 'Phân tích chỉ số y tế từ ngày đến ngày, tính toán tổng hợp, trung bình và xuất báo cáo phân tích Excel.',
    iconName: 'BarChart3',
    href: '/statistics',
    category: 'clinical',
    categoryLabel: 'Chuyên môn Điều dưỡng',
    badge: 'Ban Giám Đốc / Admin',
    status: 'active',
    roles: ['ADMIN', 'BGD'],
    statsInfo: 'Linh hoạt từ 1 - 366 ngày',
    theme: {
      accentColor: '#B7791F',
      bgGradient: 'from-[#B7791F]/10 via-[#B7791F]/5 to-transparent',
      iconBg: 'bg-[#FFF9E6]',
      iconColor: 'text-[#B7791F]',
      badgeBg: 'bg-[#FFF9E6]',
      badgeText: 'text-[#B7791F]'
    }
  },
  {
    id: 'incident-report',
    title: 'Báo Cáo Sự Cố Y Khoa',
    shortTitle: 'Sự Cố Y Khoa',
    description: 'Quy trình ghi nhận, phân loại mức độ rủi ro và xử lý các sự cố y khoa theo khuyến cáo của Bộ Y Tế.',
    iconName: 'ShieldAlert',
    href: '/incidents',
    category: 'clinical',
    categoryLabel: 'An toàn người bệnh',
    badge: 'Sắp ra mắt',
    status: 'coming_soon',
    roles: ['ADMIN', 'BGD', 'KHOA_USER'],
    statsInfo: 'Biểu mẫu chuẩn Bộ Y Tế',
    theme: {
      accentColor: '#D9534F',
      bgGradient: 'from-[#D9534F]/10 via-[#D9534F]/5 to-transparent',
      iconBg: 'bg-[#FDF2F2]',
      iconColor: 'text-[#D9534F]',
      badgeBg: 'bg-[#FDF2F2]',
      badgeText: 'text-[#D9534F]'
    }
  },
  {
    id: 'medical-supplies',
    title: 'Quản Lý Vật Tư Tiêu Hao',
    shortTitle: 'Vật Tư Tiêu Hao',
    description: 'Theo dõi tồn kho đầu kỳ, dự trù cơ số tủ thuốc trực và định mức vật tư y tế tiêu hao của từng khoa phòng.',
    iconName: 'Package',
    href: '/supplies',
    category: 'operations',
    categoryLabel: 'Dược & Vật tư',
    badge: 'Sắp ra mắt',
    status: 'coming_soon',
    roles: ['ADMIN', 'BGD', 'KHOA_USER'],
    statsInfo: 'Kiểm kê định kỳ tháng',
    theme: {
      accentColor: '#0284C7',
      bgGradient: 'from-[#0284C7]/10 via-[#0284C7]/5 to-transparent',
      iconBg: 'bg-[#F0F9FF]',
      iconColor: 'text-[#0284C7]',
      badgeBg: 'bg-[#F0F9FF]',
      badgeText: 'text-[#0284C7]'
    }
  },
  {
    id: 'quality-audit',
    title: 'Đánh Giá Kiểm Tra Điều Dưỡng',
    shortTitle: 'Kiểm Tra Điều Dưỡng',
    description: 'Bảng kiểm tra thực hiện quy trình kỹ thuật điều dưỡng, quy tắc ứng xử và an toàn người bệnh tại giường.',
    iconName: 'Sparkles',
    href: '/quality',
    category: 'clinical',
    categoryLabel: 'Quản lý chất lượng',
    badge: 'Sắp ra mắt',
    status: 'coming_soon',
    roles: ['ADMIN', 'BGD', 'KHOA_USER'],
    statsInfo: 'Tiêu chí 83 chất lượng',
    theme: {
      accentColor: '#8B5CF6',
      bgGradient: 'from-[#8B5CF6]/10 via-[#8B5CF6]/5 to-transparent',
      iconBg: 'bg-[#F5F3FF]',
      iconColor: 'text-[#8B5CF6]',
      badgeBg: 'bg-[#F5F3FF]',
      badgeText: 'text-[#8B5CF6]'
    }
  }
]
