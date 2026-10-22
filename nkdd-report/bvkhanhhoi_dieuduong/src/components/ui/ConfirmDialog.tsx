'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, AlertTriangle, LogOut, KeyRound, X } from 'lucide-react'
import { cn } from '@/lib/theme/cn'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary' | 'warning'
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'primary',
  loading = false
}: ConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Đóng bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading && !isSubmitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, loading, isSubmitting, onClose])

  if (!isOpen) return null

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true)
      await onConfirm()
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cấu hình Icon và Màu sắc theo variant
  let IconComponent = AlertCircle
  let iconBg = 'bg-[#F2F2FD] dark:bg-[#202242] text-[#6B63DE]'
  let confirmBtnClass =
    'bg-[#6B63DE] hover:bg-[#534CC9] text-white shadow-sm'

  if (variant === 'danger') {
    IconComponent = LogOut
    iconBg = 'bg-[#FDECEC] dark:bg-[#3D1E24] text-[#E11D48]'
    confirmBtnClass =
      'bg-[#E11D48] hover:bg-[#BE123C] text-white shadow-sm'
  } else if (variant === 'warning') {
    IconComponent = AlertTriangle
    iconBg = 'bg-[#FFFBEB] dark:bg-[#3B2C19] text-[#D97706]'
    confirmBtnClass =
      'bg-[#D97706] hover:bg-[#B45309] text-white shadow-sm'
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1F2050]/50 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-200 animate-in fade-in">
      <div
        className="bg-white dark:bg-[#18192E] rounded-[20px] border border-[#E8E8F2] dark:border-[#2A2C49] shadow-[0_16px_40px_rgba(31,32,80,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.45)] max-w-md w-full p-6 space-y-5 transition-all duration-200 ease-out animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        {/* Header & Icon */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                'w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 shadow-2xs',
                iconBg
              )}
            >
              <IconComponent className="w-5 h-5" strokeWidth={2} />
            </div>

            <div>
              <h3
                id="confirm-dialog-title"
                className="text-base font-bold text-[#1F2050] dark:text-[#F0F1F9] leading-snug"
              >
                {title}
              </h3>
              <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] mt-0.5 font-medium leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading || isSubmitting}
            className="p-1 rounded-[8px] text-[#8A8BA0] hover:bg-[#F0F1F9] dark:hover:bg-[#242744] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer disabled:opacity-50"
            title="Đóng"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E8E8F2] dark:border-[#2A2C49]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading || isSubmitting}
            className="h-9 px-4 rounded-[10px] text-xs font-semibold text-[#5A5B7C] dark:text-[#A3A6C4] bg-[#F0F1F9] dark:bg-[#242744] hover:bg-[#E8E8FB] dark:hover:bg-[#2F3256] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || isSubmitting}
            className={cn(
              'h-9 px-4 rounded-[10px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50',
              confirmBtnClass
            )}
          >
            {(loading || isSubmitting) && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
