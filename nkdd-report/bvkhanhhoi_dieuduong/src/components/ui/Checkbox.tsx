import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/theme/cn'

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    { className, checked, onChange, onCheckedChange, disabled, ...props },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      onCheckedChange?.(e.target.checked)
    }

    return (
      <label
        className={cn(
          'relative inline-flex items-center justify-center cursor-pointer select-none',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            'w-4 h-4 rounded-[4px] border transition-all duration-150 flex items-center justify-center',
            'border-[#D4D5E4] dark:border-[#3E4268] bg-white dark:bg-[#1E2038]',
            'peer-checked:bg-[#6B63DE] dark:peer-checked:bg-[#6B63DE] peer-checked:border-[#6B63DE] dark:peer-checked:border-[#6B63DE]',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-[#6B63DE]/30',
            className
          )}
        >
          {checked && <Check className="w-3 h-3 text-white stroke-[3]" />}
        </div>
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'
