import React from 'react'
import { cn } from '@/lib/theme/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'success'
    | 'warning'
    | 'danger'
    | 'neutral'
    | 'brand'
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
  dot?: boolean
}

export function Badge({
  className,
  variant = 'neutral',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles: Record<string, string> = {
    success: 'bg-[#E6F9EE] dark:bg-[#152B1E] text-[#1E9E52] dark:text-[#34C759] border border-[#1E9E52]/20 dark:border-[#1E9E52]/30',
    warning: 'bg-[#FFF6E0] dark:bg-[#2D2616] text-[#B7791F] dark:text-[#E0A838] border border-[#B7791F]/20 dark:border-[#B7791F]/30',
    danger: 'bg-[#FDECEC] dark:bg-[#3D1E24] text-[#C53030] dark:text-[#FF6B6B] border border-[#C53030]/20 dark:border-[#C53030]/30',
    destructive: 'bg-[#FDECEC] dark:bg-[#3D1E24] text-[#C53030] dark:text-[#FF6B6B] border border-[#C53030]/20 dark:border-[#C53030]/30',
    neutral: 'bg-[#EDEEF5] dark:bg-[#202242] text-[#5A5B7C] dark:text-[#A3A6C4] border border-[#D4D5E4]/50 dark:border-[#2A2C49]',
    secondary: 'bg-[#EDEEF5] dark:bg-[#202242] text-[#5A5B7C] dark:text-[#A3A6C4] border border-[#D4D5E4]/50 dark:border-[#2A2C49]',
    brand: 'bg-[#F2F2FD] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] border border-[#6B63DE]/20 dark:border-[#6B63DE]/30',
    default: 'bg-[#F2F2FD] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] border border-[#6B63DE]/20 dark:border-[#6B63DE]/30',
    outline: 'bg-transparent text-[#1F2050] dark:text-[#F0F1F9] border border-[#E8E8F2] dark:border-[#2A2C49]'
  }

  const dotColors: Record<string, string> = {
    success: 'bg-[#1E9E52] dark:bg-[#34C759]',
    warning: 'bg-[#B7791F] dark:bg-[#E0A838]',
    danger: 'bg-[#C53030] dark:bg-[#FF6B6B]',
    destructive: 'bg-[#C53030] dark:bg-[#FF6B6B]',
    neutral: 'bg-[#8A8BA0] dark:bg-[#A3A6C4]',
    secondary: 'bg-[#8A8BA0] dark:bg-[#A3A6C4]',
    brand: 'bg-[#6B63DE] dark:bg-[#8E87F5]',
    default: 'bg-[#6B63DE] dark:bg-[#8E87F5]',
    outline: 'bg-[#1F2050] dark:bg-[#F0F1F9]'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-semibold select-none transition-colors duration-150',
        variantStyles[variant] || variantStyles.neutral,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full animate-pulse',
            dotColors[variant] || 'bg-[#6B63DE]'
          )}
        />
      )}
      {children}
    </span>
  )
}
