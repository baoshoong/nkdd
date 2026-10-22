'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Shield,
  ChevronLeft,
  ChevronRight,
  History,
  Users,
  Clock,
  Clock3,
  BarChart3,
  LayoutGrid,
  CalendarCheck2,
  FileSpreadsheet,
  ArrowLeft,
  ArrowUpDown,
  X
} from 'lucide-react'
import { cn } from '@/lib/theme/cn'

interface SidebarProps {
  role?: string
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  initialProgress?: {
    submitted: number
    total: number
  }
  currentModule?: 'nkdd' | 'timesheet'
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  tab?: string
}

export function Sidebar({
  role,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  initialProgress,
  currentModule = 'nkdd'
}: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAdmin = role === 'ADMIN'
  const isBgd = role === 'BGD'
  const canViewDashboard = isAdmin || isBgd

  // State tiến độ nộp báo cáo thực tế
  const [progress, setProgress] = useState(
    initialProgress || { submitted: 0, total: 11 }
  )

  const refreshProgress = async () => {
    try {
      const res = await fetch('/api/reports/progress')
      if (res.ok) {
        const json = await res.json()
        setProgress({
          submitted: json.submitted,
          total: json.total
        })
      }
    } catch {
      // Giữ nguyên trạng thái nếu fetch lỗi
    }
  }

  useEffect(() => {
    if (initialProgress) {
      setProgress(initialProgress)
    }
  }, [initialProgress?.submitted, initialProgress?.total])

  // Khóa cuộn trang khi mở drawer trên mobile
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  useEffect(() => {
    // 1. Lắng nghe sự kiện cập nhật báo cáo trong cùng tab & yêu cầu sync từ Navbar
    const handleUpdate = () => {
      refreshProgress()
    }
    window.addEventListener('report-updated', handleUpdate)
    window.addEventListener('report-synced', handleUpdate)
    window.addEventListener('request-sync', handleUpdate)
    window.addEventListener('focus', handleUpdate)
    document.addEventListener('visibilitychange', handleUpdate)

    // 2. Lắng nghe Multi-Client BroadcastChannel giữa các tab/cửa sổ khác nhau
    let channel: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('nkdd-multi-client')
      channel.onmessage = () => {
        refreshProgress()
      }
    }

    // 3. Tự động cập nhật tiến độ ngầm mỗi 15 giây
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshProgress()
      }
    }, 15000)

    return () => {
      window.removeEventListener('report-updated', handleUpdate)
      window.removeEventListener('report-synced', handleUpdate)
      window.removeEventListener('request-sync', handleUpdate)
      window.removeEventListener('focus', handleUpdate)
      document.removeEventListener('visibilitychange', handleUpdate)
      channel?.close()
      clearInterval(interval)
    }
  }, [])

  const percentage =
    progress.total > 0
      ? Math.round((progress.submitted / progress.total) * 100)
      : 0

  const isTimesheet = currentModule === 'timesheet'
  const currentTab = searchParams ? searchParams.get('tab') || 'timesheet' : 'timesheet'

  const buildAttendanceHref = (tab: string) => {
    if (!searchParams) return `/attendance?tab=${tab}`
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    return `/attendance?${params.toString()}`
  }

  const navItems: NavItem[] = isTimesheet
    ? [
        {
          label: 'Bảng chấm công',
          href: buildAttendanceHref('timesheet'),
          tab: 'timesheet',
          icon: CalendarCheck2
        },
        {
          label: 'Quản lý nhân sự',
          href: buildAttendanceHref('employees'),
          tab: 'employees',
          icon: Users
        },
        {
          label: 'Thống kê',
          href: buildAttendanceHref('statistics'),
          tab: 'statistics',
          icon: BarChart3
        },
        {
          label: 'Báo cáo & Xuất file',
          href: buildAttendanceHref('reports'),
          tab: 'reports',
          icon: FileSpreadsheet
        }
      ]
    : [
        ...(canViewDashboard
          ? [
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: LayoutDashboard
              },
              {
                label: 'Thống kê',
                href: '/statistics',
                icon: BarChart3
              }
            ]
          : []),
        {
          label: 'Nhập báo cáo',
          href: '/report',
          icon: ClipboardList
        },
        ...(isAdmin
          ? [
              {
                label: 'Phân quyền',
                href: '/admin/permissions',
                icon: Shield
              },
              {
                label: 'Quản lý thứ tự',
                href: '/admin/reorder',
                icon: ArrowUpDown
              },
              {
                label: 'Người dùng',
                href: '/admin/users',
                icon: Users
              }
            ]
          : []),
        ...(canViewDashboard
          ? [
              {
                label: 'Lịch sử',
                href: '/audit',
                icon: History
              }
            ]
          : [])
      ]

  return (
    <>
      {/* Overlay cho Mobile Drawer */}
      <div
        onClick={onCloseMobile}
        className={cn(
          'fixed inset-0 bg-[#1F2050]/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300',
          mobileOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Sidebar container */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen bg-white dark:bg-[#18192E] border-r border-[#E8E8F2] dark:border-[#2A2C49] z-50 flex flex-col shrink-0 shadow-xl lg:shadow-none transition-all duration-300 ease-in-out',
          // Mobile layout: drawer kích thước tiêu chuẩn, không phụ thuộc vào cờ collapsed desktop
          'w-[280px] max-w-[85vw]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop layout (lg+): cố định bên trái, theo trạng thái collapsed
          'lg:translate-x-0 lg:max-w-none',
          collapsed ? 'lg:w-[72px]' : 'lg:w-[240px]'
        )}
      >
        {/* 1. Header: Logo & Nút Toggle (Desktop) / Nút Close (Mobile) */}
        <div className="shrink-0 h-16 px-4 flex items-center justify-between border-b border-[#E8E8F2] dark:border-[#2A2C49]">
          <Link
            href={isTimesheet ? '/timesheet' : (canViewDashboard ? '/dashboard' : '/report')}
            onClick={onCloseMobile}
            title="Bệnh viện Đa khoa Khánh Hội"
            className="flex items-center gap-3 overflow-hidden select-none min-w-0"
          >
            <Image
              src="/logo.png"
              alt="Bệnh viện Đa khoa Khánh Hội"
              width={36}
              height={36}
              className={cn(
                'shrink-0 rounded-[8px] object-contain',
                collapsed ? 'lg:w-8 lg:h-8' : 'w-9 h-9'
              )}
            />
            <div
              className={cn(
                'min-w-0 flex flex-col leading-tight',
                collapsed && 'lg:hidden'
              )}
            >
              <span className="text-sm font-bold text-[#1F2050] dark:text-[#F0F1F9] leading-tight truncate">
                Bệnh viện Đa khoa
              </span>
              <span className="text-sm font-bold text-[#6B63DE] leading-tight truncate">
                Khánh Hội
              </span>
            </div>
          </Link>

          {/* Nút đóng X trên Mobile */}
          <button
            onClick={onCloseMobile}
            title="Đóng menu"
            aria-label="Đóng menu"
            className="lg:hidden w-8 h-8 rounded-full bg-[#EDEEF5] dark:bg-[#242744] text-[#5A5B7C] dark:text-[#A3A6C4] hover:bg-[#E8E8FB] dark:hover:bg-[#2F3256] hover:text-[#6B63DE] flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Nút thu gọn / mở rộng trên Desktop */}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            className="hidden lg:flex w-7 h-7 rounded-full bg-[#EDEEF5] dark:bg-[#242744] text-[#5A5B7C] dark:text-[#A3A6C4] hover:bg-[#E8E8FB] dark:hover:bg-[#2F3256] hover:text-[#6B63DE] items-center justify-center transition cursor-pointer shrink-0"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* 2. Navigation Links: Cuộn độc lập khi màn hình thấp */}
        <nav className="flex-1 min-h-0 p-3 space-y-1.5 overflow-y-auto scrollbar-thin">
          {/* Nút trở về Menu Phân Hệ 5x5 ở đầu Sidebar */}
          <Link
            href="/menu"
            onClick={onCloseMobile}
            title="Trở về Menu Phân Hệ Ứng Dụng"
            className={cn(
              'flex items-center gap-2.5 h-10 px-3 rounded-[10px] text-xs font-bold transition-all duration-150 select-none bg-[#F2F2FD] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] hover:bg-[#E8E8FB] dark:hover:bg-[#282B52] border border-[#6B63DE]/20 dark:border-[#6B63DE]/30 shadow-2xs mb-2.5'
            )}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className={cn('truncate', collapsed && 'lg:hidden')}>
              Về Menu Phân Hệ
            </span>
          </Link>

          {/* Nhãn tên phân hệ đang hoạt động */}
          <div className={cn('px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#8A8BA0] dark:text-slate-400', collapsed && 'lg:hidden')}>
            {isTimesheet ? 'Chấm Công Nhân Viên' : 'Báo Cáo Điều Dưỡng'}
          </div>

          {navItems.map((item) => {
            const active = isTimesheet
              ? item.tab === currentTab
              : pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 h-11 px-3 rounded-[10px] text-sm font-medium transition-colors duration-150 select-none',
                  active
                    ? 'bg-[#F2F2FD] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] font-semibold shadow-2xs'
                    : 'text-[#5A5B7C] dark:text-[#A3A6C4] hover:bg-[#F0F1F9] dark:hover:bg-[#242744] hover:text-[#1F2050] dark:hover:text-[#F0F1F9]'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0',
                    active ? 'text-[#6B63DE] dark:text-[#8E87F5]' : 'text-[#8A8BA0] dark:text-slate-500'
                  )}
                />
                <span className={cn('truncate', collapsed && 'lg:hidden')}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* 3. Phần dưới: Widget chân Sidebar riêng biệt cho từng phân hệ */}
        {isTimesheet ? (
          <div className="shrink-0 p-3 border-t border-[#E8E8F2] dark:border-[#2A2C49]">
            <div className={cn(collapsed && 'lg:hidden')}>
              <div className="p-3 rounded-[12px] bg-[#EAFBF1] dark:bg-[#152B1E] border border-[#1E9E52]/20">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#1F2050] dark:text-[#F0F1F9] flex items-center gap-1.5">
                    <CalendarCheck2 className="w-3.5 h-3.5 text-[#1E9E52]" />
                    <span>Chấm công ca</span>
                  </span>
                  <span className="font-bold text-[#1E9E52]">Tháng 10</span>
                </div>
                <p className="text-[10px] text-[#5A5B7C] dark:text-[#A3A6C4]">Theo dõi lịch trực &amp; công</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="shrink-0 p-3 border-t border-[#E8E8F2] dark:border-[#2A2C49]">
            <div className={cn(collapsed && 'lg:hidden')}>
              <div className="p-3 rounded-[12px] bg-[#EDECFB] dark:bg-[#202242] border border-[#D1D2F7]/50 dark:border-[#2A2C49] transition-all duration-250">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#1F2050] dark:text-[#F0F1F9] flex items-center gap-1.5">
                    <Clock3 className="w-3.5 h-3.5 text-[#6B63DE] dark:text-[#8E87F5]" />
                    <span>Tiến độ hôm nay</span>
                  </span>
                  <span className="font-bold text-[#6B63DE] dark:text-[#8E87F5] font-mono tabular-nums">
                    {progress.submitted}/{progress.total} khoa
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/80 dark:bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-[#6B63DE] rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(0, percentage))}%`
                    }}
                  />
                </div>
                <p className="text-[10px] text-[#5A5B7C] dark:text-[#A3A6C4] mt-1.5 font-medium flex items-center justify-between">
                  <span>Giao ban điều dưỡng</span>
                  <span className="font-bold text-[#6B63DE] dark:text-[#8E87F5] tabular-nums">
                    {percentage}%
                  </span>
                </p>
              </div>
            </div>

            {collapsed && (
              <div className="hidden lg:flex justify-center">
                <div
                  className="w-8 h-8 rounded-[8px] bg-[#EDECFB] dark:bg-[#202242] border border-[#D1D2F7]/40 dark:border-[#2A2C49] flex items-center justify-center text-[#6B63DE] dark:text-[#8E87F5] text-xs font-bold font-mono tabular-nums cursor-pointer hover:bg-[#E0E0F9] dark:hover:bg-[#282B52] transition-colors duration-150"
                  title={`Tiến độ hôm nay: ${progress.submitted}/${progress.total} khoa (${percentage}%)`}
                >
                  {percentage}%
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  )
}
