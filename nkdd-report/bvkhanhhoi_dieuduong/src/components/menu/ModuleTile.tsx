'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Lock } from 'lucide-react'
import { HospitalModule, TONE_STYLES } from '@/config/modules.config'
import { cn } from '@/lib/theme/cn'

interface ModuleTileProps {
  module: HospitalModule
  userRole?: string | null
  onComingSoonClick?: (module: HospitalModule) => void
}

export function ModuleTile({
  module,
  userRole,
  onComingSoonClick
}: ModuleTileProps) {
  const isComingSoon = module.status === 'coming_soon'
  const isNew = module.status === 'new'
  const tone = TONE_STYLES[module.tone] || TONE_STYLES.slate

  // Tính toán route chuyển hướng theo vai trò (đối với Báo cáo điều dưỡng)
  let targetRoute = module.route
  if (module.id === 'nursing-report') {
    if (userRole === 'ADMIN' || userRole === 'BGD') {
      targetRoute = '/dashboard'
    } else {
      targetRoute = '/report'
    }
  }

  // Component nội dung bên trong vòng tròn icon
  const renderIconContent = () => {
    // 1. Ưu tiên iconSrc (ảnh tùy biến)
    if (module.iconSrc) {
      return (
        <div className="relative w-10 h-10">
          <Image
            src={module.iconSrc}
            alt={module.label}
            width={40}
            height={40}
            className="object-contain"
          />
        </div>
      )
    }

    // 2. Icon Lucide chuẩn
    if (module.icon) {
      const IconComponent = module.icon
      return (
        <IconComponent
          className={cn(
            'w-8 h-8 max-sm:w-7 max-sm:h-7 transition-colors duration-150',
            isComingSoon ? 'text-slate-400' : tone.iconColor
          )}
          strokeWidth={1.75}
        />
      )
    }

    // 3. Vòng tròn trống viền nét đứt thanh lịch khi không có icon
    return (
      <div className="w-8 h-8 max-sm:w-7 max-sm:h-7 rounded-full border border-dashed border-slate-300 dark:border-slate-600" />
    )
  }

  // Khung vòng tròn icon
  const iconCircle = (
    <div className="relative">
      <div
        className={cn(
          'w-[72px] h-[72px] max-sm:w-16 max-sm:h-16 rounded-full bg-white dark:bg-[#18192E] border border-slate-200 dark:border-[#2A2C49] shadow-xs flex items-center justify-center transition-all duration-150 ease-out',
          !isComingSoon && [
            'group-hover:-translate-y-0.5 group-hover:shadow-md',
            tone.hoverBorder,
            tone.hoverBg,
            'dark:group-hover:bg-[#202242]'
          ],
          isComingSoon && 'border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-[#18192E]/60'
        )}
      >
        {renderIconContent()}
      </div>

      {/* Badge "Mới" ở góc trên bên phải vòng tròn */}
      {isNew && (
        <span
          className="absolute -top-1 -right-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs leading-none select-none"
          aria-hidden="true"
        >
          Mới
        </span>
      )}

      {/* Biểu tượng ổ khóa cho phân hệ sắp ra mắt */}
      {isComingSoon && (
        <div
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-100 dark:bg-[#20223E] border border-slate-200 dark:border-[#2A2C49] flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-2xs"
          title="Sắp ra mắt"
          aria-hidden="true"
        >
          <Lock className="w-3 h-3 text-slate-500 dark:text-slate-400" strokeWidth={2} />
        </div>
      )}
    </div>
  )

  // Nhãn tên phân hệ
  const labelText = (
    <span
      className={cn(
        'mt-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 text-center line-clamp-2 max-w-[112px] leading-snug transition-colors duration-150',
        !isComingSoon && 'group-hover:text-slate-900 dark:group-hover:text-white',
        isComingSoon && 'text-slate-500 dark:text-slate-500'
      )}
    >
      {module.label}
    </span>
  )

  // Phân hệ Sắp ra mắt (coming_soon)
  if (isComingSoon) {
    return (
      <li className="list-none flex justify-center">
        <button
          type="button"
          onClick={() => onComingSoonClick?.(module)}
          aria-disabled="true"
          aria-label={`${module.label}, sắp ra mắt`}
          title={module.description || `${module.label} (sắp ra mắt)`}
          className="group flex flex-col items-center cursor-pointer select-none opacity-55 hover:opacity-80 transition-opacity duration-150 p-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B63DE] focus-visible:ring-offset-2 active:scale-[0.97]"
        >
          {iconCircle}
          {labelText}
        </button>
      </li>
    )
  }

  // Phân hệ Hoạt động (active / new)
  return (
    <li className="list-none flex justify-center">
      <Link
        href={targetRoute}
        aria-label={module.label}
        title={module.description || module.label}
        className="group flex flex-col items-center cursor-pointer select-none p-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B63DE] focus-visible:ring-offset-2 active:scale-[0.97]"
      >
        {iconCircle}
        {labelText}
      </Link>
    </li>
  )
}
