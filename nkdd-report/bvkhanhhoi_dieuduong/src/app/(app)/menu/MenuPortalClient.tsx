'use client'

import { useState, useMemo } from 'react'
import { Info, X } from 'lucide-react'
import { HOSPITAL_MODULES_CONFIG, HospitalModule } from '@/config/modules.config'
import { ModuleTile } from '@/components/menu/ModuleTile'

interface MenuPortalClientProps {
  user: {
    name?: string | null
    role?: string | null
    departmentCode?: string | null
  }
}

export function MenuPortalClient({ user }: MenuPortalClientProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Lọc và sắp xếp các phân hệ:
  // 1. enabled !== false
  // 2. Kiểm tra vai trò: roles rỗng hoặc chứa vai trò của người dùng
  // 3. Sắp xếp tăng dần theo order
  const visibleModules = useMemo(() => {
    const role = user.role || 'KHOA_USER'
    return HOSPITAL_MODULES_CONFIG
      .filter((module) => {
        if (module.enabled === false) return false
        if (!module.roles || module.roles.length === 0) return true
        return module.roles.includes(role)
      })
      .sort((a, b) => a.order - b.order)
  }, [user.role])

  // Xử lý khi click vào phân hệ sắp ra mắt
  const handleComingSoonClick = (module: HospitalModule) => {
    setToastMessage(`Phân hệ "${module.label}" đang được phát triển, sắp ra mắt!`)
    setTimeout(() => {
      setToastMessage((prev) => (prev?.includes(module.label) ? null : prev))
    }, 3500)
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-12">
      {/* Tiêu đề ẩn cho Screen Reader & SEO (a11y) */}
      <h1 className="sr-only">Phân hệ</h1>

      {/* Lưới phân hệ dạng launcher gọn gàng (CSS Grid auto-fill) */}
      {visibleModules.length > 0 ? (
        <nav aria-label="Phân hệ">
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] max-sm:grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-y-8 gap-x-6 justify-start list-none m-0 p-0">
            {visibleModules.map((module) => (
              <ModuleTile
                key={module.id}
                module={module}
                userRole={user.role}
                onComingSoonClick={handleComingSoonClick}
              />
            ))}
          </ul>
        </nav>
      ) : (
        <div className="text-center py-16 px-4 bg-white dark:bg-[#18192E] rounded-2xl border border-slate-200 dark:border-[#2A2C49] shadow-xs max-w-md mx-auto">
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
            Tài khoản chưa được cấp quyền truy cập phân hệ nào.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Vui lòng liên hệ quản trị viên để được phân quyền.
          </p>
        </div>
      )}

      {/* Toast thông báo nhẹ nhàng khi click phân hệ sắp ra mắt */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 dark:bg-[#1E2038] text-white rounded-xl shadow-lg border border-slate-800 dark:border-[#2A2C49] text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-sm"
        >
          <Info className="w-4 h-4 text-[#6B63DE] shrink-0" />
          <span className="flex-1 leading-snug">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="w-5 h-5 rounded-full hover:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
