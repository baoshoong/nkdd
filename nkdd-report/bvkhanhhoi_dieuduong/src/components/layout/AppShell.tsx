'use client'

import { useState, Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { ATTENDANCE_MODULE_ENABLED } from '@/config/modules.config'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

interface AppShellProps {
  user: {
    name?: string | null
    role?: string | null
    departmentCode?: string | null
  }
  initialProgress?: {
    submitted: number
    total: number
  }
  children: React.ReactNode
  onSignOut: () => Promise<void>
}

export function AppShell({ user, initialProgress, children, onSignOut }: AppShellProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isMenuPage = pathname === '/menu'
  const isTimesheet = pathname.startsWith('/timesheet') || pathname.startsWith('/attendance')
  const isAttendanceLocked = isTimesheet && !ATTENDANCE_MODULE_ENABLED
  const currentModule = isTimesheet ? 'timesheet' : 'nkdd'

  // Khi ở trang Menu trung tâm hoặc khi Phân hệ Chấm công đang khóa: Không hiển thị Sidebar
  if (isMenuPage || isAttendanceLocked) {
    return (
      <div className="min-h-screen bg-[#EDEEF5] dark:bg-[#0F1021] text-[#1F2050] dark:text-[#F0F1F9] flex flex-col transition-colors duration-200">
        <Topbar
          user={user}
          onOpenMobile={() => {}}
          onSignOut={onSignOut}
          isPortal={isMenuPage}
        />
        <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#EDEEF5] dark:bg-[#0F1021] text-[#1F2050] dark:text-[#F0F1F9] flex transition-colors duration-200">
      {/* Sidebar trái chuyên biệt theo phân hệ */}
      <Suspense fallback={<div className="w-64 bg-white dark:bg-[#18192E] shrink-0 border-r border-[#E8E8F2] dark:border-[#2A2C49] hidden lg:block" />}>
        <Sidebar
          role={user.role ?? undefined}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          initialProgress={initialProgress}
          currentModule={currentModule}
        />
      </Suspense>

      {/* Cột nội dung chính */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar trên cùng */}
        <Topbar
          user={user}
          onOpenMobile={() => setMobileOpen(true)}
          onSignOut={onSignOut}
          isPortal={false}
        />

        {/* Khung nội dung */}
        <main className="flex-1 p-3 sm:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
