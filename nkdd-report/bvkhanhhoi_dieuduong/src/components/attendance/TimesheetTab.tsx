'use client'

import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import {
  Users,
  CalendarCheck,
  Clock,
  X,
  GripVertical,
  Check,
  Save,
  Loader2,
  Lock,
  Unlock,
  History,
  GraduationCap,
  Briefcase,
  HeartPulse,
  Baby,
  Eye,
  EyeOff
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SyncedHorizontalScroll } from '@/components/ui/SyncedHorizontalScroll'
import { useTableDragScroll } from '@/lib/hooks/use-table-drag-scroll'
import { cn } from '@/lib/utils'
import {
  AttendanceStatus,
  ATTENDANCE_STATUS_META,
  ATTENDANCE_STATUS_ORDER
} from '@/lib/attendance/status-config'

export interface EmployeeStat {
  id: number
  code: string
  name: string
  title: string
  isActive: boolean
  resignedAt?: string | null
  presentCount: number
  businessTripCount: number
  studyCount: number
  leaveCount: number
  sickCount: number
  maternityCount: number
  absentCount: number
  totalWork: number
}

interface TimesheetTabProps {
  sheetData: {
    sheet: {
      id: number
      month: number
      year: number
      departmentId: number
      status: 'OPEN' | 'LOCKED'
      standardDays: number
      lockedAt: string | null
      lockedBy: { id: number; name: string; role: string } | null
    }
    department: {
      id: number
      code: string
      name: string
    }
    daysInMonth: number
    employees: Array<{ id: number; code: string; name: string; title: string; isActive: boolean; resignedAt?: string | null }>
  }
  employeeStats: EmployeeStat[]
  kpiSummary: {
    totalStaff: number
    standardDays: number
    totalAbsent: number
    totalLeave: number
    totalBusinessTrip?: number
    totalStudy?: number
    totalSick?: number
    totalMaternity?: number
  }
  holidayMap: Map<number, string>
  dirtyRecords: Record<string, { employeeId: number; day: number; status: AttendanceStatus; note?: string }>
  getCellStatus: (empId: number, day: number) => AttendanceStatus
  onCellCycle: (empId: number, day: number) => void
  onSetStatus: (empId: number, day: number, status: AttendanceStatus) => void
  canEdit: boolean
  isLocked: boolean
  isAdmin: boolean
  isSaving: boolean
  isLocking: boolean
  onSave: () => void
  onDiscard: () => void
  onLock?: () => void
  onUnlock?: () => void
  onOpenAuditModal?: () => void
  month: number
  year: number
}

export function TimesheetTab({
  sheetData,
  employeeStats,
  kpiSummary,
  holidayMap,
  dirtyRecords,
  getCellStatus,
  onCellCycle,
  onSetStatus,
  canEdit,
  isLocked,
  isAdmin,
  isSaving,
  isLocking,
  onSave,
  onDiscard,
  onLock,
  onUnlock,
  onOpenAuditModal,
  month,
  year
}: TimesheetTabProps) {
  const [mobileSelectedDay, setMobileSelectedDay] = useState(1)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const { isDragging, dragProps } = useTableDragScroll(tableContainerRef)
  const dirtyCount = Object.keys(dirtyRecords).length

  // Quản lý menu chuột phải chọn trực tiếp trạng thái
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    employeeId: number
    employeeName: string
    employeeCode: string
    day: number
    currentStatus: AttendanceStatus
  } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Mở menu ngữ cảnh khi click chuột phải vào ô ngày
  const handleCellContextMenu = (
    e: React.MouseEvent,
    emp: { id: number; name: string; code: string },
    d: number,
    status: AttendanceStatus,
    isResignedCell: boolean
  ) => {
    e.preventDefault()
    if (!canEdit || isLocked || isResignedCell) return

    const menuWidth = 240
    const menuHeight = 330
    const x = Math.max(10, Math.min(e.clientX, window.innerWidth - menuWidth - 10))
    const y = Math.max(10, Math.min(e.clientY, window.innerHeight - menuHeight - 10))

    setContextMenu({
      x,
      y,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeCode: emp.code,
      day: d,
      currentStatus: status
    })
  }

  // Tự động đóng menu khi click ra ngoài, cuộn trang hoặc nhấn ESC
  useEffect(() => {
    if (!contextMenu) return

    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        handleCloseContextMenu()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseContextMenu()
      }
    }

    const handleScroll = () => {
      handleCloseContextMenu()
    }

    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [contextMenu, handleCloseContextMenu])

  // Quản lý ẩn/hiện nhân viên đã thôi việc từ các tháng trước
  const [showInactive, setShowInactive] = useState(false)

  // Kiểm tra xem có nhân sự đã thôi việc từ trước tháng này không
  const hasInactivePast = useMemo(() => {
    return employeeStats.some((emp) => {
      if (emp.isActive) return false
      if (emp.resignedAt) {
        const rDate = new Date(emp.resignedAt)
        return !(rDate.getFullYear() === year && rDate.getMonth() + 1 === month && rDate.getDate() > 1)
      }
      return true
    })
  }, [employeeStats, month, year])

  // Danh sách nhân sự thực tế hiển thị trên bảng
  const displayedStats = useMemo(() => {
    return employeeStats.filter((emp) => {
      if (emp.isActive) return true
      // Nếu thôi việc trong tháng này (có ngày công tác trước ngày nghỉ), luôn hiển thị
      if (emp.resignedAt) {
        const rDate = new Date(emp.resignedAt)
        if (rDate.getFullYear() === year && rDate.getMonth() + 1 === month && rDate.getDate() > 1) {
          return true
        }
      }
      return showInactive
    })
  }, [employeeStats, showInactive, month, year])

  return (
    <div className="space-y-5">
      {/* 4 Thẻ KPI Tóm Tắt */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8A8BA0] dark:text-[#6C6F93]">Tổng nhân sự</div>
            <div className="text-xl font-extrabold text-[#1F2050] dark:text-[#F0F1F9] tabular-nums">
              {kpiSummary.totalStaff} <span className="text-xs font-normal text-[#8A8BA0] dark:text-[#6C6F93]">người</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-[#EAFBF1] dark:bg-[#152B1E] text-[#1E9E52] dark:text-[#34C759] flex items-center justify-center shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8A8BA0] dark:text-[#6C6F93]">Công chuẩn tháng</div>
            <div className="text-xl font-extrabold text-[#1E9E52] dark:text-[#34C759] tabular-nums">
              {kpiSummary.standardDays} <span className="text-xs font-normal text-[#8A8BA0] dark:text-[#6C6F93]">ngày</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-[#FDECEC] dark:bg-[#3D1E24] text-[#C53030] dark:text-[#FF6B6B] flex items-center justify-center shrink-0">
            <X className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8A8BA0] dark:text-[#6C6F93]">Tổng ngày vắng (V)</div>
            <div className="text-xl font-extrabold text-[#C53030] dark:text-[#FF6B6B] tabular-nums">
              {kpiSummary.totalAbsent} <span className="text-xs font-normal text-[#8A8BA0] dark:text-[#6C6F93]">ngày</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-[#FFF8E6] dark:bg-[#2D2616] text-[#B7791F] dark:text-[#E0A838] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8A8BA0] dark:text-[#6C6F93]">Tổng ngày phép (P)</div>
            <div className="text-xl font-extrabold text-[#B7791F] dark:text-[#E0A838] tabular-nums">
              {kpiSummary.totalLeave} <span className="text-xs font-normal text-[#8A8BA0] dark:text-[#6C6F93]">ngày</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Chú giải trạng thái chấm công & Nút bật/tắt nhân viên thôi việc */}
      <Card className="p-3.5 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-[#1F2050] dark:text-[#F0F1F9] shrink-0 mr-1">Ký hiệu chấm công:</span>
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          {ATTENDANCE_STATUS_ORDER.map((stKey) => {
            const meta = ATTENDANCE_STATUS_META[stKey]
            return (
              <span
                key={stKey}
                title={meta.description}
                className={cn(
                  'px-2.5 py-1 rounded-[8px] font-bold border border-current/20 flex items-center gap-1.5 cursor-help transition-transform hover:scale-105',
                  meta.badgeColor
                )}
              >
                <strong className="font-mono text-xs">{meta.symbol}</strong>
                <span>{meta.label}</span>
                <span className="text-[10px] opacity-75 font-normal">
                  {meta.isWorkDay ? '(+1)' : '(-1)'}
                </span>
              </span>
            )
          })}

          {/* Ký hiệu Đã thôi việc (-) */}
          <span
            title={ATTENDANCE_STATUS_META.RESIGNED.description}
            className={cn(
              'px-2.5 py-1 rounded-[8px] font-bold border border-current/20 flex items-center gap-1.5 cursor-help transition-transform hover:scale-105',
              ATTENDANCE_STATUS_META.RESIGNED.badgeColor
            )}
          >
            <strong className="font-mono text-xs">-</strong>
            <span>Đã thôi việc</span>
            <span className="text-[10px] opacity-75 font-normal">(-)</span>
          </span>
        </div>

        {/* Nút lọc ẩn/hiện nhân sự đã thôi việc từ các tháng trước */}
        {hasInactivePast && (
          <button
            type="button"
            onClick={() => setShowInactive((prev) => !prev)}
            className="ml-auto text-xs font-bold text-[#6B63DE] dark:text-[#8E87F5] hover:underline cursor-pointer flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-[8px] bg-[#EDECFB] dark:bg-[#202242] border border-[#6B63DE]/20"
          >
            {showInactive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showInactive ? 'Ẩn NV thôi việc từ trước' : 'Hiện NV thôi việc từ trước'}</span>
          </button>
        )}
      </Card>

      {/* ==================================================== */}
      {/* 1. GIAO DIỆN DESKTOP: BẢNG MA TRẬN 31 NGÀY           */}
      {/* ==================================================== */}
      <div className="hidden md:block space-y-3">
        <SyncedHorizontalScroll
          tableContainerRef={tableContainerRef}
          label="Cuộn ngang để xem tất cả các ngày trong tháng"
        />

        <div className="relative border border-[#E8E8F2] dark:border-[#2A2C49] rounded-[20px] overflow-hidden bg-white dark:bg-[#18192E] shadow-[0_4px_20px_rgba(100,100,180,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div
            ref={tableContainerRef}
            className="max-h-[calc(100vh-280px)] min-h-[380px] overflow-auto scrollbar-thin"
          >
            <table className="w-full text-xs text-left border-collapse">
              {/* Header */}
              <thead className="sticky top-0 bg-[#F6F7FB] dark:bg-[#1E2038] z-20 shadow-2xs">
                <tr className="border-b border-[#E8E8F2] dark:border-[#2A2C49]">
                  {/* Cột 1: Tên nhân viên (Sticky Left) */}
                  <th className="px-3.5 py-3 font-bold text-[#1F2050] dark:text-[#F0F1F9] border-r-2 border-[#D4D5E4] dark:border-[#3E4268] min-w-[260px] bg-[#F6F7FB] dark:bg-[#1E2038] sticky left-0 z-30 uppercase tracking-wider text-[11px] relative select-none">
                    <div className="flex items-center justify-between pr-2">
                      <span>Họ tên nhân sự</span>
                      <span className="text-[10px] font-normal text-[#8A8BA0] dark:text-[#6C6F93] flex items-center gap-0.5" title="Nhấn giữ chuột trái tại mép cột để cuộn ngang">
                        <GripVertical className="w-3.5 h-3.5 text-[#6B63DE] dark:text-[#8E87F5]" />
                      </span>
                    </div>
                    <div
                      {...dragProps}
                      title="Nhấn giữ chuột trái và kéo sang trái/phải để cuộn bảng"
                      className={cn(
                        'absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize z-40 flex items-center justify-center transition-colors',
                        isDragging ? 'bg-[#6B63DE]/30' : 'hover:bg-[#6B63DE]/20'
                      )}
                    >
                      <div className="w-1 h-5 rounded-full bg-[#6B63DE]/50" />
                    </div>
                  </th>

                  {/* Cột Chức danh */}
                  <th className="px-3 py-3 font-bold text-[#5A5B7C] dark:text-[#A3A6C4] border-r border-[#E8E8F2] dark:border-[#2A2C49] min-w-[140px] text-left">
                    Chức danh
                  </th>

                  {/* Các cột ngày 1 -> daysInMonth */}
                  {Array.from({ length: sheetData.daysInMonth }, (_, i) => i + 1).map((d) => {
                    const dt = new Date(Date.UTC(year, month - 1, d))
                    const dow = dt.getUTCDay()
                    const isSunday = dow === 0
                    const isSaturday = dow === 6
                    const holidayName = holidayMap.get(d)
                    const isWeekendOrHoliday = isSunday || isSaturday || Boolean(holidayName)

                    let dowLabel = 'T' + (dow + 1)
                    if (isSunday) dowLabel = 'CN'
                    if (isSaturday) dowLabel = 'T7'

                    return (
                      <th
                        key={d}
                        {...dragProps}
                        className={cn(
                          'px-1.5 py-2 text-center border-r border-[#E8E8F2] dark:border-[#2A2C49] min-w-[34px] cursor-grab active:cursor-grabbing select-none',
                          isWeekendOrHoliday
                            ? 'bg-[#FFF8E6] dark:bg-[#2D2616] text-[#B7791F] dark:text-[#E0A838]'
                            : 'text-[#1F2050] dark:text-[#F0F1F9]'
                        )}
                        title={holidayName ? `Ngày ${d}/${month}: ${holidayName}` : `Ngày ${d}/${month} (${dowLabel})`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-[11px] font-bold">{d}</span>
                          <span className="text-[9px] font-medium opacity-75">{dowLabel}</span>
                        </div>
                      </th>
                    )
                  })}

                  {/* 7 Cột Tổng kết */}
                  <th className="px-2 py-3 font-bold text-center border-r border-[#E8E8F2] dark:border-[#2A2C49] min-w-[55px] bg-[#FFFBF0] dark:bg-[#241F14] text-[#B7791F] dark:text-[#E0A838]" title="Tổng ngày công hưởng lương">
                    Công
                  </th>
                  <th className="px-1.5 py-3 font-bold text-center border-r border-[#E8E8F2] dark:border-[#2A2C49] min-w-[38px] bg-[#EFF6FF] dark:bg-[#1E293B] text-[#2563EB] dark:text-[#60A5FA]" title="Công tác (tính công)">
                    CT
                  </th>
                  <th className="px-1.5 py-3 font-bold text-center border-r border-[#E8E8F2] dark:border-[#2A2C49] min-w-[38px] bg-[#F5F3FF] dark:bg-[#2E1065] text-[#7C3AED] dark:text-[#A78BFA]" title="Đi học / Đào tạo (tính công)">
                    Học
                  </th>
                  <th className="px-1.5 py-3 font-bold text-center border-r border-[#E8E8F2] dark:border-[#2A2C49] min-w-[38px] bg-[#FFF8E6] dark:bg-[#2D2616] text-[#B7791F] dark:text-[#E0A838]" title="Nghỉ phép">
                    Phép
                  </th>
                  <th className="px-1.5 py-3 font-bold text-center border-r border-[#E8E8F2] dark:border-[#2A2C49] min-w-[38px] bg-[#FFF7ED] dark:bg-[#431407] text-[#EA580C] dark:text-[#FB923C]" title="Nghỉ ốm (hưởng BHXH)">
                    Ốm
                  </th>
                  <th className="px-1.5 py-3 font-bold text-center border-r border-[#E8E8F2] dark:border-[#2A2C49] min-w-[38px] bg-[#FDF2F8] dark:bg-[#500724] text-[#DB2777] dark:text-[#F472B6]" title="Nghỉ thai sản (hưởng BHXH)">
                    TS
                  </th>
                  <th className="px-1.5 py-3 font-bold text-center min-w-[38px] bg-[#FDECEC] dark:bg-[#3D1E24] text-[#C53030] dark:text-[#FF6B6B]" title="Vắng không phép">
                    Vắng
                  </th>
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-[#E8E8F2] dark:divide-[#2A2C49]">
                {displayedStats.map((emp) => {
                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-[#F0F1F9]/60 dark:hover:bg-[#242744] transition-colors"
                    >
                      {/* Cột Tên NV (Sticky Left) */}
                      <td className="px-3.5 py-2 font-semibold text-[#1F2050] dark:text-[#F0F1F9] border-r-2 border-[#D4D5E4] dark:border-[#3E4268] bg-white dark:bg-[#18192E] sticky left-0 z-10 whitespace-nowrap relative select-none">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#1F2050] dark:text-[#F0F1F9]">
                              {emp.name}
                            </span>
                            {!emp.isActive && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FDECEC] dark:bg-[#3D1E24] text-[#C53030] dark:text-[#FF6B6B]"
                                title={emp.resignedAt ? `Nghỉ từ ${new Date(emp.resignedAt).toLocaleDateString('vi-VN')}` : undefined}
                              >
                                Đã nghỉ
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#8A8BA0] dark:text-[#6C6F93] font-mono">
                              {emp.code}
                            </span>
                            {emp.resignedAt && (
                              <span className="text-[9px] text-[#8A8BA0] dark:text-[#6C6F93] italic">
                                ({new Date(emp.resignedAt).toLocaleDateString('vi-VN')})
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          {...dragProps}
                          title="Nhấn giữ chuột trái kéo để cuộn bảng"
                          className={cn(
                            'absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize z-20 hover:bg-[#6B63DE]/20 transition-colors',
                            isDragging && 'bg-[#6B63DE]/20'
                          )}
                        />
                      </td>

                      {/* Chức danh */}
                      <td className="px-3 py-2 text-xs text-[#5A5B7C] dark:text-[#A3A6C4] border-r border-[#E8E8F2] dark:border-[#2A2C49]">
                        {emp.title}
                      </td>

                      {/* Các ô ngày 1 -> daysInMonth */}
                      {Array.from({ length: sheetData.daysInMonth }, (_, i) => i + 1).map((d) => {
                        const status = getCellStatus(emp.id, d)
                        const isResignedCell = status === 'RESIGNED'
                        const isDirty = Boolean(dirtyRecords[`${emp.id}_${d}`])
                        const dt = new Date(Date.UTC(year, month - 1, d))
                        const isWeekend = dt.getUTCDay() === 0 || dt.getUTCDay() === 6
                        const holidayName = holidayMap.get(d)
                        const meta = ATTENDANCE_STATUS_META[status] || ATTENDANCE_STATUS_META.PRESENT

                        return (
                          <td
                            key={d}
                            onClick={() => {
                              if (!isResignedCell) {
                                onCellCycle(emp.id, d)
                              }
                            }}
                            onContextMenu={(e) =>
                              handleCellContextMenu(e, emp, d, status, isResignedCell)
                            }
                            className={cn(
                              'p-0 text-center border-r border-[#E8E8F2] dark:border-[#2A2C49] transition-colors select-none',
                              isResignedCell
                                ? 'cursor-not-allowed bg-[#F6F7FB] dark:bg-[#1E2038]'
                                : canEdit
                                ? 'cursor-pointer hover:ring-2 hover:ring-[#6B63DE]'
                                : 'cursor-not-allowed',
                              isWeekend && !isDirty && status === 'PRESENT' && 'bg-[#FFFDF7] dark:bg-[#201c13]',
                              holidayName && !isDirty && status === 'PRESENT' && 'bg-[#FFF9EA] dark:bg-[#282115]'
                            )}
                            title={
                              isResignedCell
                                ? `Ngày ${d}/${month} - Đã thôi việc (không tính công / vắng)`
                                : `${holidayName ? `${holidayName} • ` : ''}Ngày ${d}/${month} - ${meta.label} (${meta.symbol}) • Click trái để xoay vòng, Chuột phải để mở menu chọn`
                            }
                          >
                            <div
                              className={cn(
                                'w-full h-8 flex items-center justify-center font-bold text-xs transition-colors',
                                meta.cellTextColor,
                                meta.darkCellTextColor,
                                status !== 'PRESENT' && meta.cellBgColor,
                                status !== 'PRESENT' && meta.darkCellBgColor,
                                isDirty && 'ring-1 ring-inset ring-[#6B63DE]',
                                isResignedCell && 'font-mono text-[#8A8BA0] dark:text-[#6C6F93]'
                              )}
                            >
                              {meta.symbol}
                            </div>
                          </td>
                        )
                      })}

                      {/* 7 Cột Tổng kết */}
                      <td className="px-1.5 py-1.5 text-center font-mono font-bold tabular-nums text-[#B7791F] dark:text-[#E0A838] bg-[#FFFBF0]/60 dark:bg-[#241F14] border-r border-[#E8E8F2] dark:border-[#2A2C49]">
                        {emp.totalWork}
                      </td>
                      <td className="px-1 py-1.5 text-center font-mono font-bold tabular-nums text-[#2563EB] dark:text-[#60A5FA] bg-[#EFF6FF]/60 dark:bg-[#1E293B]/60 border-r border-[#E8E8F2] dark:border-[#2A2C49]">
                        {emp.businessTripCount || 0}
                      </td>
                      <td className="px-1 py-1.5 text-center font-mono font-bold tabular-nums text-[#7C3AED] dark:text-[#A78BFA] bg-[#F5F3FF]/60 dark:bg-[#2E1065]/60 border-r border-[#E8E8F2] dark:border-[#2A2C49]">
                        {emp.studyCount || 0}
                      </td>
                      <td className="px-1 py-1.5 text-center font-mono font-bold tabular-nums text-[#B7791F] dark:text-[#E0A838] bg-[#FFF8E6]/60 dark:bg-[#2D2616]/60 border-r border-[#E8E8F2] dark:border-[#2A2C49]">
                        {emp.leaveCount || 0}
                      </td>
                      <td className="px-1 py-1.5 text-center font-mono font-bold tabular-nums text-[#EA580C] dark:text-[#FB923C] bg-[#FFF7ED]/60 dark:bg-[#431407]/60 border-r border-[#E8E8F2] dark:border-[#2A2C49]">
                        {emp.sickCount || 0}
                      </td>
                      <td className="px-1 py-1.5 text-center font-mono font-bold tabular-nums text-[#DB2777] dark:text-[#F472B6] bg-[#FDF2F8]/60 dark:bg-[#500724]/60 border-r border-[#E8E8F2] dark:border-[#2A2C49]">
                        {emp.maternityCount || 0}
                      </td>
                      <td className="px-1 py-1.5 text-center font-mono font-bold tabular-nums text-[#C53030] dark:text-[#FF6B6B] bg-[#FDECEC]/60 dark:bg-[#3D1E24]/60">
                        {emp.absentCount || 0}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. GIAO DIỆN MOBILE: TAB CHỌN NGÀY (1..31)           */}
      {/* ==================================================== */}
      <div className="block md:hidden space-y-4">
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-[#5A5B7C] dark:text-[#A3A6C4]">
            Chọn ngày chấm công:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
            {Array.from({ length: sheetData.daysInMonth }, (_, i) => i + 1).map((d) => {
              const dt = new Date(Date.UTC(year, month - 1, d))
              const isWeekend = dt.getUTCDay() === 0 || dt.getUTCDay() === 6
              const isSelected = mobileSelectedDay === d
              const holidayName = holidayMap.get(d)

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setMobileSelectedDay(d)}
                  className={cn(
                    'flex flex-col items-center justify-center min-w-[42px] h-12 rounded-[12px] border text-xs font-bold transition select-none cursor-pointer shrink-0',
                    isSelected
                      ? 'bg-[#6B63DE] text-white border-[#6B63DE] shadow-xs'
                      : isWeekend || holidayName
                      ? 'bg-[#FFF8E6] dark:bg-[#2D2616] text-[#B7791F] dark:text-[#E0A838] border-[#B7791F]/30'
                      : 'bg-white dark:bg-[#18192E] text-[#1F2050] dark:text-[#F0F1F9] border-[#E8E8F2] dark:border-[#2A2C49]'
                  )}
                >
                  <span className="text-xs">{d}</span>
                  <span className="text-[9px] font-normal opacity-80">
                    {dt.getUTCDay() === 0 ? 'CN' : `T${dt.getUTCDay() + 1}`}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Chi tiết ngày đang chọn */}
        <div className="flex items-center justify-between p-3 rounded-[14px] bg-[#EDECFB] dark:bg-[#202242] border border-[#6B63DE]/20 text-xs">
          <span className="font-bold text-[#6B63DE] dark:text-[#8E87F5]">
            Ngày {mobileSelectedDay}/{month}/{year}
            {holidayMap.has(mobileSelectedDay) && ` - ${holidayMap.get(mobileSelectedDay)}`}
          </span>
          <span className="text-[11px] text-[#5A5B7C] dark:text-[#A3A6C4]">
            {sheetData.employees.length} nhân sự
          </span>
        </div>

        {/* Danh sách thẻ nhân viên theo ngày đang chọn */}
        <div className="space-y-3">
          {displayedStats.map((emp) => {
            const status = getCellStatus(emp.id, mobileSelectedDay)
            const isResignedCell = status === 'RESIGNED'
            const isDirty = Boolean(dirtyRecords[`${emp.id}_${mobileSelectedDay}`])

            return (
              <Card key={emp.id} className={cn('p-4 space-y-3', isDirty && 'ring-2 ring-[#6B63DE]')}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-[#1F2050] dark:text-[#F0F1F9]">{emp.name}</h4>
                      {!emp.isActive && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FDECEC] dark:bg-[#3D1E24] text-[#C53030] dark:text-[#FF6B6B]">
                          Đã nghỉ
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4]">{emp.title} &bull; <span className="font-mono">{emp.code}</span></p>
                  </div>

                  <div className="text-right text-xs">
                    <span className="text-[10px] text-[#8A8BA0] dark:text-[#6C6F93]">Tháng này:</span>
                    <div className="font-bold text-[#B7791F] dark:text-[#E0A838]">
                      {emp.totalWork} <span className="text-[10px] font-normal">công</span>
                    </div>
                  </div>
                </div>

                {/* Nếu là ô sau ngày thôi việc */}
                {isResignedCell ? (
                  <div className="p-2.5 rounded-[10px] bg-[#F6F7FB] dark:bg-[#1E2038] border border-[#E8E8F2] dark:border-[#2A2C49] flex items-center justify-between text-xs">
                    <span className="text-[#8A8BA0] dark:text-[#6C6F93] italic">
                      Đã thôi việc từ ngày này (ô tự động khóa [-])
                    </span>
                    <span className="font-mono font-bold text-sm px-2.5 py-0.5 rounded bg-[#EDECFB] dark:bg-[#202242] text-[#8A8BA0] dark:text-[#6C6F93]">
                      -
                    </span>
                  </div>
                ) : (
                  /* 7 Nút bấm chuyển trạng thái 1 chạm trên mobile */
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
                    {ATTENDANCE_STATUS_ORDER.map((stKey) => {
                      const meta = ATTENDANCE_STATUS_META[stKey]
                      const isActive = status === stKey
                      return (
                        <button
                          key={stKey}
                          type="button"
                          disabled={!canEdit}
                          onClick={() => onSetStatus(emp.id, mobileSelectedDay, stKey)}
                          className={cn(
                            'h-8 px-1 rounded-[8px] border text-[11px] font-bold flex items-center justify-center gap-1 transition select-none cursor-pointer',
                            isActive
                              ? 'shadow-xs border-current ring-1 ring-current ' + meta.badgeColor
                              : 'bg-white dark:bg-[#1E2038] text-[#5A5B7C] dark:text-[#A3A6C4] border-[#E8E8F2] dark:border-[#2A2C49] hover:bg-[#F6F7FB] dark:hover:bg-[#242744]'
                          )}
                          title={meta.description}
                        >
                          <strong className="font-mono">{meta.symbol}</strong>
                          <span className="truncate">{meta.shortLabel}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Floating Save Bar */}
      {dirtyCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-[#18192E]/95 backdrop-blur-md border border-[#6B63DE]/30 rounded-[20px] shadow-[0_12px_40px_rgba(31,32,80,0.2)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFB020] animate-pulse" />
            <span className="text-xs font-bold text-[#1F2050] dark:text-[#F0F1F9]">
              Có <span className="text-[#6B63DE] dark:text-[#8E87F5] font-extrabold">{dirtyCount}</span> ô thay đổi chưa lưu
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onDiscard}
              disabled={isSaving}
              className="font-semibold text-xs h-8"
            >
              Hủy bỏ
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="font-bold text-xs h-8 gap-1.5 shadow-sm"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Lưu bảng công</span>
            </Button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. CONTEXT MENU CHUỘT PHẢI CHỌN TRẠNG THÁI          */}
      {/* ==================================================== */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-64 rounded-[16px] bg-white/95 dark:bg-[#18192E]/95 backdrop-blur-md shadow-[0_16px_40px_rgba(31,32,80,0.20)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-[#E8E8F2] dark:border-[#2A2C49] py-1.5 animate-in fade-in zoom-in-95 duration-100 select-none"
        >
          {/* Header thông tin ô đang chọn */}
          <div className="px-3 py-2 border-b border-[#F0F1F9] dark:border-[#2A2C49] mb-1">
            <div className="flex items-center justify-between text-xs font-bold text-[#1F2050] dark:text-[#F0F1F9]">
              <span className="truncate max-w-[150px]">{contextMenu.employeeName}</span>
              <span className="font-mono text-[10px] text-[#6B63DE] dark:text-[#8E87F5] bg-[#EDECFB] dark:bg-[#202242] px-1.5 py-0.5 rounded">
                {contextMenu.employeeCode}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#8A8BA0] dark:text-[#6C6F93] mt-0.5">
              <span>Ngày {contextMenu.day}/{month}/{year}</span>
              <span className="text-[10px] font-semibold text-[#6B63DE] dark:text-[#8E87F5]">Chọn nhanh</span>
            </div>
          </div>

          {/* Danh sách 7 trạng thái */}
          <div className="px-1 space-y-0.5 max-h-[300px] overflow-y-auto scrollbar-thin">
            {ATTENDANCE_STATUS_ORDER.map((stKey) => {
              const meta = ATTENDANCE_STATUS_META[stKey]
              const isSelected = contextMenu.currentStatus === stKey

              return (
                <button
                  key={stKey}
                  type="button"
                  onClick={() => {
                    onSetStatus(contextMenu.employeeId, contextMenu.day, stKey)
                    handleCloseContextMenu()
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-[10px] text-xs font-semibold transition-colors cursor-pointer text-left',
                    isSelected
                      ? 'bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5]'
                      : 'text-[#1F2050] dark:text-[#F0F1F9] hover:bg-[#F6F7FB] dark:hover:bg-[#242744]'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'w-6 h-6 rounded-[6px] font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-current/20',
                        meta.badgeColor
                      )}
                    >
                      {meta.symbol}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-xs leading-tight truncate">{meta.label}</span>
                      <span className="text-[10px] text-[#8A8BA0] dark:text-[#6C6F93] font-normal leading-tight">
                        {meta.isWorkDay ? '+1 công bệnh viện' : '-1 công chuẩn'}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-[#6B63DE] dark:text-[#8E87F5] shrink-0 ml-1.5" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
