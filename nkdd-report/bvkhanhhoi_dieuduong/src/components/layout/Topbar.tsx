'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Menu,
  Clock,
  LogOut,
  KeyRound,
  RefreshCw,
  LayoutGrid,
  ChevronDown,
  Moon,
  Sun,
  Shield,
  Building2,
  Check
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useTheme } from '@/lib/theme/use-theme'
import { formatDateTimeWithSeconds } from '@/lib/date-utils'
import { cn } from '@/lib/theme/cn'

interface TopbarProps {
  user: {
    name?: string | null
    role?: string | null
    departmentCode?: string | null
  }
  onOpenMobile: () => void
  onSignOut: () => Promise<void>
  isPortal?: boolean
}

export function Topbar({ user, onOpenMobile, onSignOut, isPortal = false }: TopbarProps) {
  const pathname = usePathname()
  const { isDark, toggleTheme } = useTheme()

  const [timeStr, setTimeStr] = useState<string>('')
  const [lastSyncTime, setLastSyncTime] = useState<string>('')
  const [isSyncing, setIsSyncing] = useState(false)

  // State cho Dropdown Menu của Avatar
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // State cho các hộp thoại xác nhận (Confirm Dialog)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const isTimesheet = pathname.startsWith('/timesheet') || pathname.startsWith('/attendance')

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isDropdownOpen])

  // Xử lý khi nhấn nút Đồng bộ ngay trên Navbar
  const handleManualSync = () => {
    if (isSyncing) return
    setIsSyncing(true)
    const now = new Date()
    const formatted = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    setLastSyncTime(formatted)

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('request-sync'))
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('nkdd-multi-client')
        channel.postMessage({ type: 'REQUEST_SYNC' })
        channel.close()
      }
    }

    setTimeout(() => {
      setIsSyncing(false)
    }, 700)
  }

  // 1. Đồng hồ thời gian thực (giây) theo múi giờ Hồ Chí Minh
  useEffect(() => {
    const updateTime = () => {
      setTimeStr(formatDateTimeWithSeconds(new Date()))
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // 2. Lắng nghe sự kiện cập nhật số liệu đa máy khách (Multi-Client)
  useEffect(() => {
    const getFormattedTime = () => {
      const now = new Date()
      return `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    }

    setLastSyncTime(getFormattedTime())

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ time?: string }>
      if (customEvent.detail?.time) {
        setLastSyncTime(customEvent.detail.time)
      } else {
        setLastSyncTime(getFormattedTime())
      }
    }

    window.addEventListener('report-synced', handleSync)
    window.addEventListener('report-updated', handleSync)

    let channel: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('nkdd-multi-client')
      channel.onmessage = () => {
        setLastSyncTime(getFormattedTime())
      }
    }

    return () => {
      window.removeEventListener('report-synced', handleSync)
      window.removeEventListener('report-updated', handleSync)
      channel?.close()
    }
  }, [])

  // Xử lý xác nhận đăng xuất
  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true)
      await onSignOut()
    } finally {
      setIsLoggingOut(false)
      setIsLogoutConfirmOpen(false)
    }
  }

  // Xử lý xác nhận mở modal đổi mật khẩu
  const handleConfirmChangePassword = () => {
    setIsPasswordConfirmOpen(false)
    setIsPasswordModalOpen(true)
  }

  const getRoleDisplayName = (role?: string | null) => {
    if (role === 'ADMIN') return 'Quản Trị Viên'
    if (role === 'BGD') return 'Ban Giám Đốc'
    return 'Điều Dưỡng Khoa'
  }

  return (
    <header className="h-16 bg-white dark:bg-[#18192E] border-b border-[#E8E8F2] dark:border-[#2A2C49] px-3 sm:px-6 sticky top-0 z-30 flex items-center justify-between shrink-0 transition-colors duration-200">
      {/* Nút menu mở mobile + Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {!isPortal && (
          <button
            onClick={onOpenMobile}
            className="lg:hidden p-2 -ml-1 rounded-[8px] text-[#5A5B7C] dark:text-[#A3A6C4] hover:bg-[#F0F1F9] dark:hover:bg-[#242744] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer shrink-0"
            title="Mở menu điều hướng"
            aria-label="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {isPortal ? (
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Logo Bệnh viện"
              width={34}
              height={34}
              className="rounded-[8px] object-contain shadow-2xs"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-[#1F2050] dark:text-[#F0F1F9] tracking-tight leading-tight">
                Bệnh viện Đa khoa Khánh Hội
              </span>
              <span className="text-[11px] font-semibold text-[#6B63DE] leading-tight">
                Cổng Quản Lý Phân Hệ Y Tế
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Tiêu đề trên Desktop */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-[#5A5B7C] dark:text-[#A3A6C4] truncate">
              <span className="font-semibold text-[#1F2050] dark:text-[#F0F1F9] truncate">
                Bệnh viện Đa khoa Khánh Hội
              </span>
              <span className="text-[#D4D5E4] dark:text-[#3B3E63]">/</span>
              <span className="text-[#6B63DE] font-medium truncate">
                {isTimesheet ? 'Chấm Công & Phân Ca Trực' : 'Báo cáo Điều dưỡng 24h'}
              </span>
            </div>

            {/* Tiêu đề rút gọn trên Mobile */}
            <div className="sm:hidden flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-xs text-[#1F2050] dark:text-[#F0F1F9] truncate">
                {isTimesheet ? 'Chấm Công' : 'Báo cáo ĐD'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Thông tin bên phải: Menu button, Last sync badge, Refresh button, Clock, User Avatar Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Nút trở về Menu phân hệ ứng dụng (chỉ hiện khi đang ở trong phân hệ) */}
        {!isPortal && (
          <Link
            href="/menu"
            className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-full bg-[#F2F2FD] dark:bg-[#202242] hover:bg-[#E8E8FB] dark:hover:bg-[#282B52] border border-[#6B63DE]/20 text-[#6B63DE] dark:text-[#8E87F5] text-xs font-bold transition-colors duration-150 cursor-pointer shadow-2xs select-none shrink-0"
            title="Trở về Menu phân hệ ứng dụng"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Menu Phân Hệ</span>
          </Link>
        )}

        {/* CẬP NHẬT LẦN CUỐI TRÊN NAVBAR (MULTI-CLIENT BADGE) (CHỈ HIỆN KHI Ở PHÂN HỆ BÁO CÁO) */}
        {!isTimesheet && lastSyncTime && (
          <div
            className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-full bg-[#EDF9F0] dark:bg-[#152B1E] border border-[#1E9E52]/25 text-[#1E9E52] text-xs font-semibold select-none shadow-2xs"
            title="Thời điểm dữ liệu báo cáo được đồng bộ mới nhất"
          >
            <span className="w-2 h-2 rounded-full bg-[#1E9E52] animate-pulse shrink-0" />
            <span className="hidden md:inline">Cập nhật:</span>
            <span className="font-mono tabular-nums">{lastSyncTime}</span>
          </div>
        )}

        {/* Nút Đồng bộ ngay (CHỈ HIỆN KHI Ở PHÂN HỆ BÁO CÁO) */}
        {!isTimesheet && (
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            title="Đồng bộ dữ liệu báo cáo toàn viện ngay lập tức"
            aria-label="Đồng bộ ngay"
            className="w-8 h-8 rounded-full bg-[#F2F2FD] dark:bg-[#202242] hover:bg-[#E8E8FB] dark:hover:bg-[#282B52] text-[#6B63DE] dark:text-[#8E87F5] hover:text-[#534CC9] border border-[#6B63DE]/20 flex items-center justify-center transition-colors duration-150 cursor-pointer shadow-2xs select-none shrink-0 disabled:opacity-60"
          >
            <RefreshCw
              className={cn(
                'w-3.5 h-3.5',
                isSyncing && 'animate-spin text-[#6B63DE]'
              )}
            />
          </button>
        )}

        {/* Đồng hồ thời gian thực */}
        {timeStr && (
          <div className="hidden xl:inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#F2F2FD] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] text-xs font-semibold font-mono tabular-nums select-none border border-[#6B63DE]/15">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeStr}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* AVATAR INTERACTIVE DROPDOWN (TÍCH HỢP TẤT CẢ VÀO 1 ĐIỂM) */}
        {/* ======================================================== */}
        <div className="relative pl-1.5 sm:pl-2 border-l border-[#E8E8F2] dark:border-[#2A2C49]" ref={dropdownRef}>
          {/* Nút trigger Avatar Dropdown */}
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            aria-label="Menu tài khoản cá nhân"
            className={cn(
              'flex items-center gap-2 p-1 rounded-full sm:rounded-xl transition-all duration-150 cursor-pointer select-none border border-transparent',
              'hover:bg-[#F2F2FD] dark:hover:bg-[#242744] hover:border-[#6B63DE]/20',
              isDropdownOpen && 'bg-[#F2F2FD] dark:bg-[#242744] border-[#6B63DE]/30 shadow-2xs'
            )}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#6B63DE] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-2xs shrink-0 ring-2 ring-transparent group-hover:ring-[#6B63DE]/30">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>

            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-[#1F2050] dark:text-[#F0F1F9] leading-tight truncate max-w-[120px]">
                {user.name}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] font-semibold text-[#6B63DE] dark:text-[#8E87F5]">
                  {user.role}
                </span>
                {user.departmentCode && (
                  <span className="text-[10px] text-[#5A5B7C] dark:text-[#A3A6C4]">
                    ({user.departmentCode})
                  </span>
                )}
              </div>
            </div>

            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-[#5A5B7C] dark:text-[#A3A6C4] transition-transform duration-200 ml-0.5 hidden sm:block',
                isDropdownOpen && 'rotate-180 text-[#6B63DE]'
              )}
            />
          </button>

          {/* Menu Dropdown trôi nổi */}
          {isDropdownOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#18192E] border border-[#E8E8F2] dark:border-[#2A2C49] rounded-2xl shadow-[0_16px_40px_rgba(31,32,80,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              {/* 1. Header: Thông tin tài khoản */}
              <div className="p-3 bg-[#F6F7FB] dark:bg-[#1E2038] rounded-[14px] border border-[#E8E8F2] dark:border-[#2A2C49] mb-1.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#6B63DE] text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-[#1F2050] dark:text-[#F0F1F9] truncate">
                      {user.name || 'Người dùng'}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B63DE] dark:text-[#8E87F5]">
                        <Shield className="w-3 h-3" />
                        {getRoleDisplayName(user.role)}
                      </span>
                      {user.departmentCode && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-[#5A5B7C] dark:text-[#A3A6C4] font-medium">
                          • Khoa {user.departmentCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Toggle Dark Mode */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  toggleTheme()
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-[12px] text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9] hover:bg-[#F0F1F9] dark:hover:bg-[#242744] transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[8px] bg-[#F2F2FD] dark:bg-[#282B52] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center shrink-0">
                    {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#6B63DE]" />}
                  </div>
                  <span>{isDark ? 'Chế độ sáng' : 'Chế độ tối (Dark Mode)'}</span>
                </div>

                <div
                  className={cn(
                    'w-9 h-5 rounded-full p-0.5 transition-colors duration-200 flex items-center',
                    isDark ? 'bg-[#6B63DE] justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  )}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-2xs" />
                </div>
              </button>

              <div className="my-1.5 border-t border-[#E8E8F2] dark:border-[#2A2C49]" />

              {/* 3. Nút Đổi mật khẩu (Mở Confirm trước) */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsDropdownOpen(false)
                  setIsPasswordConfirmOpen(true)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] text-xs font-semibold text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] hover:bg-[#F0F1F9] dark:hover:bg-[#242744] transition-colors cursor-pointer select-none"
              >
                <div className="w-7 h-7 rounded-[8px] bg-[#F0F1F9] dark:bg-[#242744] text-[#5A5B7C] dark:text-[#A3A6C4] flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <span>Đổi mật khẩu cá nhân</span>
              </button>

              {/* 4. Nút Đăng xuất (Mở Confirm trước) */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsDropdownOpen(false)
                  setIsLogoutConfirmOpen(true)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] text-xs font-semibold text-[#E11D48] dark:text-[#F43F5E] hover:bg-[#FFF1F2] dark:hover:bg-[#3D1E24] transition-colors cursor-pointer select-none mt-0.5"
              >
                <div className="w-7 h-7 rounded-[8px] bg-[#FFF1F2] dark:bg-[#3D1E24] text-[#E11D48] dark:text-[#F43F5E] flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>Đăng xuất hệ thống</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* CÁC DIALOG XÁC NHẬN AN TOÀN (CONFIRM ALERTS)              */}
      {/* ======================================================== */}

      {/* 1. Xác nhận Đăng xuất */}
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Xác nhận đăng xuất"
        description="Bạn có chắc chắn muốn đăng xuất khỏi hệ thống Bệnh viện Đa khoa Khánh Hội không?"
        confirmText="Đăng xuất"
        cancelText="Hủy bỏ"
        variant="danger"
        loading={isLoggingOut}
      />

      {/* 2. Xác nhận Đổi mật khẩu */}
      <ConfirmDialog
        isOpen={isPasswordConfirmOpen}
        onClose={() => setIsPasswordConfirmOpen(false)}
        onConfirm={handleConfirmChangePassword}
        title="Xác nhận đổi mật khẩu"
        description="Bạn có muốn mở hộp thoại để tiến hành cập nhật mật khẩu mới cho tài khoản này không?"
        confirmText="Tiếp tục"
        cancelText="Hủy bỏ"
        variant="primary"
      />

      {/* 3. Form Đổi mật khẩu cá nhân (sau khi đã confirm) */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </header>
  )
}
