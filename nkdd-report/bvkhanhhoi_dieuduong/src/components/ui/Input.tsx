import React from 'react'
import { cn } from '@/lib/theme/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full h-10 px-3 rounded-[10px] bg-white dark:bg-[#1E2038] text-[#1F2050] dark:text-[#F0F1F9] text-sm border transition-shadow duration-150',
          'placeholder:text-[#8A8BA0] dark:placeholder:text-[#6C6F93]',
          'focus:outline-none focus:border-[#6B63DE] dark:focus:border-[#8E87F5] focus:ring-2 focus:ring-[#6B63DE]/20 dark:focus:ring-[#8E87F5]/25',
          'disabled:bg-[#EDEEF5] dark:disabled:bg-[#141526] disabled:cursor-not-allowed',
          error
            ? 'border-[#F04444] focus:border-[#F04444] focus:ring-[#F04444]/20'
            : 'border-[#E8E8F2] dark:border-[#2A2C49]',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
