'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Eye, EyeOff, X, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  changePasswordSchema,
  ChangePasswordInput
} from '@/lib/schemas/auth-user-schemas'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  if (!isOpen) return null

  const handleClose = () => {
    reset()
    setServerError(null)
    setSuccess(null)
    onClose()
  }

  const onSubmit = async (data: ChangePasswordInput) => {
    setServerError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const resJson = await res.json()
      if (!res.ok) {
        throw new Error(resJson.error || 'Đổi mật khẩu thất bại')
      }

      setSuccess('Đổi mật khẩu thành công!')
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Lỗi hệ thống')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1F2050]/50 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-250 animate-in fade-in">
      <div className="bg-white dark:bg-[#18192E] rounded-[20px] border border-[#E8E8F2] dark:border-[#2A2C49] shadow-[0_16px_40px_rgba(31,32,80,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.45)] max-w-md w-full p-6 space-y-5 transition-all duration-250 ease-out animate-in zoom-in-95">
        {/* Header Modal */}
        <div className="flex items-start justify-between pb-3 border-b border-[#E8E8F2] dark:border-[#2A2C49]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#EDECFB] dark:bg-[#282B52] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1F2050] dark:text-[#F0F1F9]">
                Đổi mật khẩu cá nhân
              </h3>
              <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium">
                Cập nhật mật khẩu để bảo mật tài khoản
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-[8px] text-[#8A8BA0] hover:bg-[#F0F1F9] dark:hover:bg-[#242744] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông báo lỗi từ server nếu có */}
        {serverError && (
          <div className="p-3 text-xs font-semibold text-[#C53030] dark:text-rose-400 bg-[#FDECEC] dark:bg-[#3D1E24] border border-[#C53030]/20 dark:border-rose-900 rounded-[10px] flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Thông báo thành công */}
        {success && (
          <div className="p-3 text-xs font-semibold text-[#1E9E52] dark:text-emerald-400 bg-[#E6F9EE] dark:bg-[#152B1E] border border-[#1E9E52]/20 dark:border-emerald-900 rounded-[10px] flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form đổi mật khẩu React Hook Form + Zod */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
              Mật khẩu hiện tại
            </label>
            <div className="relative">
              <Input
                type={showCurrent ? 'text' : 'password'}
                {...register('currentPassword')}
                placeholder="Nhập mật khẩu hiện tại"
                className="pr-10 dark:bg-[#1E2038] dark:border-[#2A2C49] dark:text-white"
                aria-invalid={errors.currentPassword ? 'true' : 'false'}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-3 text-[#8A8BA0] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-[11px] font-semibold text-[#C53030] dark:text-rose-400 mt-1">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
              Mật khẩu mới
            </label>
            <div className="relative">
              <Input
                type={showNew ? 'text' : 'password'}
                {...register('newPassword')}
                placeholder="Ít nhất 6 ký tự"
                className="pr-10 dark:bg-[#1E2038] dark:border-[#2A2C49] dark:text-white"
                aria-invalid={errors.newPassword ? 'true' : 'false'}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-3 text-[#8A8BA0] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-[11px] font-semibold text-[#C53030] dark:text-rose-400 mt-1">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                {...register('confirmPassword')}
                placeholder="Nhập lại mật khẩu mới"
                className="pr-10 dark:bg-[#1E2038] dark:border-[#2A2C49] dark:text-white"
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-3 text-[#8A8BA0] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[11px] font-semibold text-[#C53030] dark:text-rose-400 mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Nút thao tác */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E8F2] dark:border-[#2A2C49]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleClose}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmitting}
              className="font-bold"
            >
              Lưu mật khẩu mới
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
