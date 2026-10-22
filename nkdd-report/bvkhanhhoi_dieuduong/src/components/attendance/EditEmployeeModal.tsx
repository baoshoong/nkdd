'use client'

import { useState, useEffect } from 'react'
import { UserCheck, Loader2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface EditEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedEmployee: {
    id: number
    code: string
    name: string
    title: string
    isActive: boolean
    resignedAt?: string | null
  }) => void
  employee: {
    id: number
    code: string
    name: string
    title: string
    isActive: boolean
    resignedAt?: string | null
  } | null
  departmentName: string
}

export function EditEmployeeModal({
  isOpen,
  onClose,
  onSuccess,
  employee,
  departmentName
}: EditEmployeeModalProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [title, setTitle] = useState('Điều dưỡng viên')
  const [isActive, setIsActive] = useState(true)
  const [resignedAt, setResignedAt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (employee) {
      setCode(employee.code)
      setName(employee.name)
      setTitle(employee.title)
      setIsActive(employee.isActive)
      if (employee.resignedAt) {
        setResignedAt(new Date(employee.resignedAt).toISOString().split('T')[0])
      } else {
        setResignedAt(new Date().toISOString().split('T')[0])
      }
      setError(null)
    }
  }, [employee])

  if (!isOpen || !employee) return null

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
      const res = await fetch(`/api/attendance/employees/${employee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          title: title.trim(),
          isActive,
          resignedAt: isActive ? null : resignedAt || null
        })
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Không thể cập nhật nhân viên')
      }

      onSuccess(json.employee)
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
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1F2050] dark:text-[#F0F1F9]">
                Chỉnh Sửa Hồ Sơ Nhân Sự
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
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono text-xs uppercase"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#5A5B7C] dark:text-[#A3A6C4]">
              Họ và tên nhân sự <span className="text-[#C53030]">*</span>
            </label>
            <Input
              type="text"
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

          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-[#5A5B7C] dark:text-[#A3A6C4]">
              Trạng thái nhân sự
            </label>
            <select
              value={isActive ? 'true' : 'false'}
              onChange={(e) => setIsActive(e.target.value === 'true')}
              className="w-full h-10 px-3 rounded-[12px] text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9] bg-white dark:bg-[#1E2038] border border-[#E8E8F2] dark:border-[#2A2C49] focus:outline-none focus:ring-2 focus:ring-[#6B63DE]/20 cursor-pointer shadow-2xs"
            >
              <option value="true">Đang làm việc (Hoạt động)</option>
              <option value="false">Đã nghỉ việc (Lưu trữ)</option>
            </select>
            {!isActive && (
              <div className="space-y-2 pt-1.5 p-3 rounded-[12px] bg-[#FFF8E6] dark:bg-[#2D2616] border border-[#B7791F]/30">
                <label className="text-xs font-bold text-[#B7791F] dark:text-[#E0A838] block">
                  Ngày chính thức thôi việc / nghỉ việc:
                </label>
                <Input
                  type="date"
                  value={resignedAt}
                  onChange={(e) => setResignedAt(e.target.value)}
                  className="text-xs font-semibold bg-white dark:bg-[#18192E]"
                  required={!isActive}
                />
                <p className="text-[11px] text-[#B7791F] dark:text-[#E0A838] italic leading-tight">
                  * Trên bảng chấm công, từ ngày này trở đi hệ thống sẽ tự động gạch ngang [-], khóa ô không cho chấm và không tính vắng.
                </p>
              </div>
            )}
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
                <Save className="w-4 h-4" />
              )}
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
