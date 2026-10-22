import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/theme/cn'

export interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  variant?: 'purple' | 'blue' | 'yellow' | 'pink'
  delta?: {
    value: string | number
    isPositive?: boolean
    label?: string
  }
  className?: string
}

export function StatCard({
  title,
  value,
  icon,
  variant = 'purple',
  delta,
  className
}: StatCardProps) {
  const variantStyles = {
    purple: {
      card: 'bg-[#EDECFB] dark:bg-[#202242] border-[#D1D2F7]/40 dark:border-[#333766]',
      iconBg: 'bg-white dark:bg-[#18192E] text-[#6B63DE] dark:text-[#8E87F5] shadow-xs dark:shadow-none'
    },
    blue: {
      card: 'bg-[#E1F0FB] dark:bg-[#15273C] border-[#BCE1F9]/40 dark:border-[#1E3B5C]',
      iconBg: 'bg-white dark:bg-[#18192E] text-[#3EA9F5] dark:text-[#58B9FA] shadow-xs dark:shadow-none'
    },
    yellow: {
      card: 'bg-[#FFF3DA] dark:bg-[#2D2616] border-[#FFE2A8]/40 dark:border-[#473B1F]',
      iconBg: 'bg-white dark:bg-[#18192E] text-[#F0A93B] dark:text-[#F3B95B] shadow-xs dark:shadow-none'
    },
    pink: {
      card: 'bg-[#FCE7EC] dark:bg-[#341B26] border-[#F7C6D2]/40 dark:border-[#4F2639]',
      iconBg: 'bg-white dark:bg-[#18192E] text-[#E56B8A] dark:text-[#EB87A0] shadow-xs dark:shadow-none'
    }
  }

  return (
    <div
      className={cn(
        'rounded-[16px] border p-4.5 flex flex-col justify-between transition hover:shadow-sm',
        variantStyles[variant].card,
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className={cn(
            'w-10 h-10 rounded-[10px] flex items-center justify-center',
            variantStyles[variant].iconBg
          )}
        >
          {icon}
        </div>
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/40',
              delta.isPositive ? 'text-[#1E9E52] dark:text-[#34C759]' : 'text-[#C53030] dark:text-[#FF6B6B]'
            )}
          >
            {delta.isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {delta.value}
          </span>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-[#5A5B7C] dark:text-[#A3A6C4] tracking-wide mb-1">
          {title}
        </p>
        <p className="text-2xl font-bold text-[#1F2050] dark:text-[#F0F1F9] tracking-tight tabular-nums">
          {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
        </p>
        {delta?.label && (
          <p className="text-[11px] text-[#8A8BA0] dark:text-[#6C6F93] mt-1 font-medium">{delta.label}</p>
        )}
      </div>
    </div>
  )
}
