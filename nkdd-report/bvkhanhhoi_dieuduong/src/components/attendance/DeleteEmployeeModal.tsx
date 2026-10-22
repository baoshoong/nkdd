'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface DeleteEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (deletedId: number, message: string) => void
  employee: {
    id: number
    code: string
    name: string
    title: string
  } | null
}

export function DeleteEmployeeModal({
  isOpen,
  onClose,
  onSuccess,
  employee
}: DeleteEmployeeModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [resignedAt, setResignedAt] = useState(() => new Date().toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !employee) return null

  const handleDelete = async () => {
    setError(null)
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/attendance/employees/${employee.id}?resignedAt=${encodeURIComponent(resignedAt)}`, {
        method: 'DELETE'
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Không thể xóa nhân viên')
      }

      onSuccess(employee.id, json.message || 'Xóa nhân sự thành công')
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#18192E] rounded-[24px] shadow-[0_20px_60px_rgba(31,32,80,0.18)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-[#E8E8F2] dark:border-[#2A2C49] p-6 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F1F9] dark:border-[#2A2C49]">
          <div className="flex items-center gap-2.5 text-[#C53030] dark:text-[#FF6B6B]">
            <div className="w-9 h-9 rounded-[12px] bg-[#FDECEC] dark:bg-[#3D1E24] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#1F2050] dark:text-[#F0F1F9]">
              Xác Nhận Xóa Nhân Sự
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#F0F1F9] dark:hover:bg-[#242744] flex items-center justify-center text-[#8A8BA0] dark:text-[#6C6F93] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] leading-relaxed">
            Bạn có chắc chắn muốn xóa nhân sự sau khỏi khoa phòng?
          </p>

          <div className="p-3.5 rounded-[14px] bg-[#F6F7FB] dark:bg-[#1E2038] border border-[#E8E8F2] dark:border-[#2A2C49] space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8A8BA0] dark:text-[#6C6F93]">Họ và tên:</span>
              <span className="font-bold text-[#1F2050] dark:text-[#F0F1F9]">{employee.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8A8BA0] dark:text-[#6C6F93]">Mã nhân viên:</span>
              <span className="font-mono font-bold text-[#6B63DE] dark:text-[#8E87F5]">{employee.code}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8A8BA0] dark:text-[#6C6F93]">Chức danh:</span>
              <span className="text-[#5A5B7C] dark:text-[#A3A6C4]">{employee.title}</span>
            </div>
          </div>

          <div className="space-y-1.5 p-3 rounded-[12px] bg-[#FFF8E6] dark:bg-[#2D2616] border border-[#B7791F]/30">
            <label className="text-xs font-bold text-[#B7791F] dark:text-[#E0A838] block">
              Ngày chính thức nghỉ việc (nếu có bản ghi công cần lưu trữ):
            </label>
            <Input
              type="date"
              value={resignedAt}
              onChange={(e) => setResignedAt(e.target.value)}
              className="text-xs font-semibold bg-white dark:bg-[#18192E]"
            />
          </div>

          <p className="text-[11px] text-[#8A8BA0] dark:text-[#6C6F93] italic leading-snug">
            * Lưu ý: Nếu nhân sự này đã có dữ liệu chấm công, hệ thống sẽ tự động chuyển sang &quot;Đã nghỉ việc&quot; từ ngày này và khóa các ô chấm công sau ngày nghỉ việc.
          </p>

          {error && (
            <div className="p-3 rounded-[12px] bg-[#FDECEC] dark:bg-[#3D1E24] border border-[#C53030]/20 text-[#C53030] dark:text-[#FF6B6B] text-xs font-semibold">
              {error}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isDeleting}
            className="font-semibold text-xs h-9 px-4"
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={isDeleting}
            className="font-bold text-xs h-9 px-4 gap-1.5"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>{isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
