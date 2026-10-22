import React from 'react'
import { cn } from '@/lib/theme/cn'

export interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  color?: string
}

export function ProgressBar({ value, max = 100, className, color = 'bg-[#6B63DE]' }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={cn('w-full h-2 rounded-full bg-[#EDEEF5] dark:bg-[#202242] overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500 ease-out', color)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
