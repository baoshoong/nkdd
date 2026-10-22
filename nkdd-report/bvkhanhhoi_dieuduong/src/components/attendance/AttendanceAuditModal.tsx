'use client'

import { useEffect, useState } from 'react'
import { History, Loader2, ArrowRight, X, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatDateTimeWithSeconds } from '@/lib/date-utils'
import { cn } from '@/lib/theme/cn'
import { ATTENDANCE_STATUS_META, AttendanceStatus } from '@/lib/attendance/status-config'

interface AuditItem {
  id: number
  day: number
  oldStatus: string
  newStatus: string
  createdAt: string
  user: {
    id: number
    name: string
    username: string
    role: string
  }
  employee: {
    id: number
    code: string
    name: string
    title: string
  }
}

interface AttendanceAuditModalProps {
  isOpen: boolean
  onClose: () => void
  sheetId: number | null
  month: number
  year: number
  departmentName: string
}

function StatusBadge({ status }: { status: string }) {
  const meta = ATTENDANCE_STATUS_META[status as AttendanceStatus]
  if (meta) {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-bold border border-current/20',
          meta.badgeColor
        )}
      >
        {meta.label} ({meta.symbol})
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-bold bg-[#EAFBF1] dark:bg-[#152B1E] text-[#1E9E52] dark:text-[#34C759] border border-[#1E9E52]/20">
      {status}
    </span>
  )
}

export function AttendanceAuditModal({
  isOpen,
  onClose,
  sheetId,
  month,
  year,
  departmentName
}: AttendanceAuditModalProps) {
  const [audits, setAudits] = useState<AuditItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !sheetId) return

    let isMounted = true
    const fetchAudits = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/attendance/sheets/${sheetId}/audits`)
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.error || 'Không thể tải nhật ký chỉnh sửa')
        }
        if (isMounted) {
          setAudits(json.audits || [])
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchAudits()
    return () => {
      isMounted = false
    }
  }, [isOpen, sheetId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-white dark:bg-[#18192E] rounded-[24px] shadow-[0_20px_60px_rgba(31,32,80,0.18)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-[#E8E8F2] dark:border-[#2A2C49] animate-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-[#F0F1F9] dark:border-[#2A2C49] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1F2050] dark:text-[#F0F1F9]">
                Nhật Ký Chỉnh Sửa Chấm Công
              </h3>
              <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] mt-0.5">
                Khoa {departmentName} &bull; Tháng {month}/{year}
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

        {/* Content list */}
        <div className="flex-1 overflow-auto p-5 scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#5A5B7C] dark:text-[#A3A6C4]">
              <Loader2 className="w-6 h-6 animate-spin text-[#6B63DE] dark:text-[#8E87F5]" />
              <span className="text-xs font-semibold">Đang tải lịch sử điều chỉnh...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-4 rounded-[14px] bg-[#FDECEC] dark:bg-[#3D1E24] text-[#C53030] dark:text-[#FF6B6B] text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : audits.length === 0 ? (
            <div className="text-center py-16 text-[#8A8BA0] dark:text-[#6C6F93]">
              <History className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">Chưa có thay đổi nào được ghi nhận</p>
              <p className="text-xs mt-1">Mọi thao tác sửa đổi ô chấm công sẽ được ghi vết tự động tại đây</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {audits.map((audit) => (
                <div
                  key={audit.id}
                  className="p-3.5 rounded-[14px] border border-[#E8E8F2] dark:border-[#2A2C49] bg-[#F8F9FD] dark:bg-[#1E2038] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1F2050] dark:text-[#F0F1F9]">
                        {audit.employee.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-[#18192E] border border-[#E8E8F2] dark:border-[#2A2C49] text-[#6B63DE] dark:text-[#8E87F5]">
                        {audit.employee.code}
                      </span>
                    </div>
                    <div className="text-[#5A5B7C] dark:text-[#A3A6C4] text-[11px]">
                      Ngày {audit.day}/{month}/{year}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={audit.oldStatus} />
                    <ArrowRight className="w-3.5 h-3.5 text-[#8A8BA0] dark:text-[#6C6F93]" />
                    <StatusBadge status={audit.newStatus} />
                  </div>

                  <div className="text-right text-[11px] space-y-0.5 sm:min-w-[140px]">
                    <div className="font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
                      {audit.user.name} ({audit.user.role})
                    </div>
                    <div className="text-[#8A8BA0] dark:text-[#6C6F93] font-mono">
                      {formatDateTimeWithSeconds(audit.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#F0F1F9] dark:border-[#2A2C49] bg-[#F8F9FD] dark:bg-[#18192E] flex items-center justify-between text-xs text-[#8A8BA0] dark:text-[#6C6F93]">
          <span>Tổng {audits.length} lượt thao tác</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-xs rounded-[10px] bg-white dark:bg-[#1E2038] border border-[#E8E8F2] dark:border-[#2A2C49] text-[#1F2050] dark:text-[#F0F1F9] hover:bg-[#F0F1F9] dark:hover:bg-[#242744] transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
