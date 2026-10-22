import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/theme/cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'ghost'
    | 'danger'
    | 'success'
    | 'default'
    | 'destructive'
    | 'outline'
    | 'link'
  size?: 'sm' | 'md' | 'lg' | 'default' | 'xs' | 'icon'
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 ease-out cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B63DE]/30'

    const variantStyles: Record<string, string> = {
      primary:
        'bg-[#6B63DE] text-white hover:bg-[#534CC9] active:bg-[#403AA6] shadow-xs',
      default:
        'bg-[#6B63DE] text-white hover:bg-[#534CC9] active:bg-[#403AA6] shadow-xs',
      secondary:
        'bg-white dark:bg-[#1E2038] text-[#1F2050] dark:text-[#F0F1F9] border border-[#E8E8F2] dark:border-[#2A2C49] hover:bg-[#F6F7FB] dark:hover:bg-[#242744] active:bg-[#EDEEF5] dark:active:bg-[#202242] shadow-xs',
      outline:
        'bg-transparent text-[#1F2050] dark:text-[#F0F1F9] border border-[#E8E8F2] dark:border-[#2A2C49] hover:bg-[#F6F7FB] dark:hover:bg-[#1E2038]',
      ghost:
        'bg-transparent text-[#5A5B7C] dark:text-[#A3A6C4] hover:bg-[#F0F1F9] dark:hover:bg-[#242744] hover:text-[#1F2050] dark:hover:text-[#F0F1F9]',
      danger:
        'bg-[#F04444] text-white hover:bg-[#D32F2F] active:bg-[#B71C1C] shadow-xs',
      destructive:
        'bg-[#F04444] text-white hover:bg-[#D32F2F] active:bg-[#B71C1C] shadow-xs',
      success:
        'bg-[#34C759] text-white hover:bg-[#2EB34F] active:bg-[#289E45] shadow-xs',
      link: 'text-[#6B63DE] dark:text-[#8E87F5] underline-offset-4 hover:underline'
    }

    const sizeStyles: Record<string, string> = {
      xs: 'h-6 px-2 text-xs rounded-[6px] gap-1',
      sm: 'h-8 px-3 text-xs rounded-[6px] gap-1.5',
      md: 'h-10 px-4 text-sm rounded-[10px] gap-2',
      default: 'h-10 px-4 text-sm rounded-[10px] gap-2',
      lg: 'h-11 px-5 text-sm rounded-[10px] gap-2',
      icon: 'w-9 h-9 p-0 rounded-[10px]'
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          baseStyles,
          variantStyles[variant] || variantStyles.primary,
          sizeStyles[size] || sizeStyles.md,
          className
        )}
        {...props}
      >
        {loading && (
          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-current shrink-0 stroke-[2.5]" />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
