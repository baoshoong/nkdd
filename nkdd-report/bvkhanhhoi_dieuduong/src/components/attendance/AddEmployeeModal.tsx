'use client'

import { useState } from 'react'
import { Plus, Loader2, UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface AddEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newEmployee: { id: number; code: string; name: string; title: string }) => void
  departmentId: number
  departmentName: string
}

export function AddEmployeeModal({
  isOpen,
  onClose,
  onSuccess,
  departmentId,
  departmentName
}: AddEmployeeModalProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [title, setTitle] = useState('Điều dưỡng viên')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!code.trim()) {
      setError('Vui lòng nhập mã nhân viên')
      return
    }
    if (!name.trim()) {
      setError('Vui lòng nhập họ và tên nhân viên')
      return
    }
    if (!title.trim()) {
      setError('Vui lòng nhập chức danh')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/attendance/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          title: title.trim(),
          departmentId
        })
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Không thể thêm nhân viên')
      }

      onSuccess(json.employee)
      setCode('')
      setName('')
      setTitle('Điều dưỡng viên')
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#18192E] rounded-[24px] shadow-[0_20px_60px_rgba(31,32,80,0.18)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-[#E8E8F2] dark:border-[#2A2C49] p-6 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F1F9] dark:border-[#2A2C49]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[12px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1F2050] dark:text-[#F0F1F9]">
                Thêm Nhân Sự Khoa
              </h3>
              <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4]">
                Khoa: <span className="font-semibold text-[#6B63DE] dark:text-[#8E87F5]">{departmentName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#F0F1F9] dark:hover:bg-[#242744] flex items-center justify-center text-[#8A8BA0] dark:text-[#6C6F93] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-[12px] bg-[#FDECEC] dark:bg-[#3D1E24] border border-[#C53030]/20 text-[#C53030] dark:text-[#FF6B6B] text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#5A5B7C] dark:text-[#A3A6C4]">
              Mã nhân viên <span className="text-[#C53030]">*</span>
            </label>
            <Input
              type="text"
              placeholder="Ví dụ: DD-NOI-05"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono text-xs uppercase"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#5A5B7C] dark:text-[#A3A6C4]">
              Họ và tên điều dưỡng <span className="text-[#C53030]">*</span>
            </label>
            <Input
              type="text"
              placeholder="Ví dụ: Nguyễn Văn An"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs font-semibold"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#5A5B7C] dark:text-[#A3A6C4]">
              Chức danh chuyên môn <span className="text-[#C53030]">*</span>
            </label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 rounded-[12px] text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9] bg-white dark:bg-[#1E2038] border border-[#E8E8F2] dark:border-[#2A2C49] focus:outline-none focus:ring-2 focus:ring-[#6B63DE]/20 cursor-pointer shadow-2xs"
            >
              <option value="Điều dưỡng trưởng">Điều dưỡng trưởng</option>
              <option value="Điều dưỡng viên">Điều dưỡng viên</option>
              <option value="Hộ sinh trưởng">Hộ sinh trưởng</option>
              <option value="Hộ sinh viên">Hộ sinh viên</option>
              <option value="Kỹ thuật viên trưởng">Kỹ thuật viên trưởng</option>
              <option value="Kỹ thuật viên">Kỹ thuật viên</option>
              <option value="Y công / Hộ lý">Y công / Hộ lý</option>
            </select>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="font-semibold text-xs h-9 px-4"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="font-bold text-xs h-9 px-4 gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{isSubmitting ? 'Đang thêm...' : 'Thêm nhân sự'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
