'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  CalendarCheck,
  Users,
  BarChart3,
  FileSpreadsheet,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  History
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TimesheetTab, EmployeeStat } from '@/components/attendance/TimesheetTab'
import { EmployeeManagementTab, EmployeeItem } from '@/components/attendance/EmployeeManagementTab'
import { AttendanceStatisticsTab } from '@/components/attendance/AttendanceStatisticsTab'
import { AttendanceReportsTab } from '@/components/attendance/AttendanceReportsTab'
import { AddEmployeeModal } from '@/components/attendance/AddEmployeeModal'
import { EditEmployeeModal } from '@/components/attendance/EditEmployeeModal'
import { DeleteEmployeeModal } from '@/components/attendance/DeleteEmployeeModal'
import { AttendanceAuditModal } from '@/components/attendance/AttendanceAuditModal'
import {
  AttendanceStatus,
  ATTENDANCE_STATUS_META,
  ATTENDANCE_CYCLE_ORDER
} from '@/lib/attendance/status-config'

interface AttendanceClientProps {
  initialUser: {
    id: string
    name?: string | null
    role?: string | null
    departmentId?: number | null
  }
}

interface HolidayItem {
  day: number
  name: string
}

interface SheetResponse {
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
  holidays: HolidayItem[]
  employees: EmployeeItem[]
  records: Record<number, Record<number, { status: string; note?: string | null }>>
  departments: Array<{ id: number; code: string; name: string }>
}

type TabKey = 'timesheet' | 'employees' | 'statistics' | 'reports'

export function AttendanceClient({ initialUser }: AttendanceClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 1. Quản lý Tab hiện tại từ URL query hoặc mặc định là 'timesheet'
  const currentTab = (searchParams.get('tab') as TabKey) || 'timesheet'
  const setTab = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // 2. Bộ lọc Tháng, Năm & Khoa (đồng bộ linh hoạt với query params)
  const initialMonthParam = searchParams.get('month')
  const initialYearParam = searchParams.get('year')
  const initialDeptParam = searchParams.get('departmentId')

  const [month, setMonthState] = useState<number>(() =>
    initialMonthParam ? parseInt(initialMonthParam, 10) : 10
  )
  const [year, setYearState] = useState<number>(() =>
    initialYearParam ? parseInt(initialYearParam, 10) : 2026
  )
  const [selectedDeptId, setSelectedDeptIdState] = useState<number | null>(() =>
    initialDeptParam ? parseInt(initialDeptParam, 10) : (initialUser.departmentId ?? null)
  )

  const setMonth = (m: number) => {
    setMonthState(m)
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', String(m))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const setYear = (y: number) => {
    setYearState(y)
    const params = new URLSearchParams(searchParams.toString())
    params.set('year', String(y))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const setSelectedDeptId = (dId: number | null) => {
    setSelectedDeptIdState(dId)
    const params = new URLSearchParams(searchParams.toString())
    if (dId) {
      params.set('departmentId', String(dId))
    } else {
      params.delete('departmentId')
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const [sheetData, setSheetData] = useState<SheetResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Danh sách nhân viên khoa đầy đủ (cả active và inactive) phục vụ Tab 2
  const [allDepartmentEmployees, setAllDepartmentEmployees] = useState<EmployeeItem[]>([])

  // Lưu trữ các ô bị sửa đổi chưa bấm lưu: key = `${employeeId}_${day}`
  const [dirtyRecords, setDirtyRecords] = useState<Record<string, { employeeId: number; day: number; status: AttendanceStatus; note?: string }>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isLocking, setIsLocking] = useState(false)

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null)
  const [deleteTargetEmployee, setDeleteTargetEmployee] = useState<EmployeeItem | null>(null)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev))
    }, 3500)
  }

  // Tải dữ liệu bảng chấm công & nhân sự khoa
  const fetchSheet = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        month: String(month),
        year: String(year)
      })
      if (selectedDeptId) {
        params.set('departmentId', String(selectedDeptId))
      }

      const res = await fetch(`/api/attendance/sheets?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Không thể tải bảng chấm công')
      }

      setSheetData(json)
      if (!selectedDeptId && json.department) {
        setSelectedDeptId(json.department.id)
      }
      setDirtyRecords({})

      // Đồng thời tải danh sách nhân sự đầy đủ của khoa cho Tab Quản lý nhân sự
      const targetDeptId = selectedDeptId || json.department?.id
      if (targetDeptId) {
        const empRes = await fetch(`/api/attendance/employees?departmentId=${targetDeptId}&includeInactive=true`)
        const empJson = await empRes.json()
        if (empRes.ok && empJson.employees) {
          setAllDepartmentEmployees(empJson.employees)
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }, [month, year, selectedDeptId])

  useEffect(() => {
    fetchSheet()
  }, [fetchSheet])

  // Map ngày lễ trong tháng
  const holidayMap = useMemo(() => {
    const map = new Map<number, string>()
    if (sheetData?.holidays) {
      sheetData.holidays.forEach((h) => map.set(h.day, h.name))
    }
    return map
  }, [sheetData?.holidays])

  // Lấy trạng thái hiện tại của một ô
  const getCellStatus = useCallback((empId: number, day: number): AttendanceStatus => {
    const dirtyKey = `${empId}_${day}`
    if (dirtyRecords[dirtyKey]) {
      return dirtyRecords[dirtyKey].status
    }
    const orig = sheetData?.records[empId]?.[day]?.status
    if (orig && ATTENDANCE_STATUS_META[orig as AttendanceStatus]) {
      return orig as AttendanceStatus
    }
    return 'PRESENT'
  }, [dirtyRecords, sheetData?.records])

  // Click xoay vòng trạng thái ô theo thứ tự: ✓ -> CT -> H -> P -> Ô -> TS -> V -> ✓
  const handleCellCycle = (empId: number, day: number) => {
    if (!sheetData) return
    if (sheetData.sheet.status === 'LOCKED') {
      showToast('Bảng chấm công này đã bị khoá, không thể chỉnh sửa!')
      return
    }
    if (initialUser.role === 'BGD') {
      showToast('Ban Giám Đốc chỉ có quyền xem, không được chỉnh sửa!')
      return
    }

    const currentStatus = getCellStatus(empId, day)
    if (currentStatus === 'RESIGNED') {
      showToast('Nhân sự đã thôi việc từ ngày này, ô chấm công đã bị khóa!')
      return
    }

    const currentIndex = ATTENDANCE_CYCLE_ORDER.indexOf(currentStatus)
    const nextIndex = (currentIndex + 1) % ATTENDANCE_CYCLE_ORDER.length
    const nextStatus = ATTENDANCE_CYCLE_ORDER[nextIndex]

    const dirtyKey = `${empId}_${day}`
    const origStatus = (sheetData.records[empId]?.[day]?.status as AttendanceStatus) || 'PRESENT'

    setDirtyRecords((prev) => {
      const updated = { ...prev }
      if (nextStatus === origStatus) {
        delete updated[dirtyKey]
      } else {
        updated[dirtyKey] = {
          employeeId: empId,
          day,
          status: nextStatus
        }
      }
      return updated
    })
  }

  // Đặt nhanh trạng thái (dùng trên mobile hoặc context picker)
  const handleSetStatus = (empId: number, day: number, status: AttendanceStatus) => {
    if (!sheetData) return
    if (sheetData.sheet.status === 'LOCKED') {
      showToast('Bảng chấm công này đã bị khoá!')
      return
    }
    if (initialUser.role === 'BGD') return

    const currentStatus = getCellStatus(empId, day)
    if (currentStatus === 'RESIGNED') {
      showToast('Nhân sự đã thôi việc từ ngày này, ô chấm công đã bị khóa!')
      return
    }

    const dirtyKey = `${empId}_${day}`
    const origStatus = (sheetData.records[empId]?.[day]?.status as AttendanceStatus) || 'PRESENT'

    setDirtyRecords((prev) => {
      const updated = { ...prev }
      if (status === origStatus) {
        delete updated[dirtyKey]
      } else {
        updated[dirtyKey] = {
          employeeId: empId,
          day,
          status
        }
      }
      return updated
    })
  }

  // Lưu các thay đổi
  const handleSave = async () => {
    if (!sheetData) return
    const recordsToSave = Object.values(dirtyRecords)
    if (recordsToSave.length === 0) return

    try {
      setIsSaving(true)
      const res = await fetch(`/api/attendance/sheets/${sheetData.sheet.id}/records`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: recordsToSave })
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Lỗi khi lưu bảng chấm công')
      }

      showToast(`Đã lưu thành công ${recordsToSave.length} ô chấm công!`)
      await fetchSheet()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi lưu bảng chấm công')
    } finally {
      setIsSaving(false)
    }
  }

  // Huỷ bỏ các thay đổi chưa lưu
  const handleDiscard = () => {
    setDirtyRecords({})
  }

  // Khoá sổ bảng chấm công
  const handleLock = async () => {
    if (!sheetData) return
    if (!confirm(`Bạn có chắc chắn muốn khoá sổ bảng chấm công Tháng ${month}/${year}? Sau khi khoá, Trưởng khoa sẽ không thể chỉnh sửa số liệu.`)) {
      return
    }

    try {
      setIsLocking(true)
      const res = await fetch(`/api/attendance/sheets/${sheetData.sheet.id}/lock`, {
        method: 'POST'
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Lỗi khi khoá sổ')
      }

      showToast('Đã khoá sổ bảng chấm công thành công!')
      await fetchSheet()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi khoá sổ')
    } finally {
      setIsLocking(false)
    }
  }

  // Mở khoá bảng chấm công (Chỉ Admin)
  const handleUnlock = async () => {
    if (!sheetData) return
    if (!confirm(`Mở khoá bảng chấm công Tháng ${month}/${year} để Trưởng khoa tiếp tục cập nhật số liệu?`)) {
      return
    }

    try {
      setIsLocking(true)
      const res = await fetch(`/api/attendance/sheets/${sheetData.sheet.id}/unlock`, {
        method: 'POST'
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Lỗi khi mở khoá')
      }

      showToast('Đã mở khoá bảng chấm công thành công!')
      await fetchSheet()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi mở khoá')
    } finally {
      setIsLocking(false)
    }
  }

  // Thêm nhân viên thành công
  const handleAddEmployeeSuccess = (newEmp: { id: number; code: string; name: string; title: string }) => {
    showToast(`Đã thêm nhân sự "${newEmp.name}" vào khoa thành công!`)
    fetchSheet()
  }

  // Cập nhật nhân viên thành công
  const handleEditEmployeeSuccess = (updatedEmp: { id: number; code: string; name: string; title: string; isActive: boolean }) => {
    showToast(`Đã cập nhật nhân sự "${updatedEmp.name}" thành công!`)
    fetchSheet()
  }

  // Xoá nhân viên thành công
  const handleDeleteEmployeeSuccess = (id: number, message: string) => {
    showToast(message)
    fetchSheet()
  }

  // Tính toán tổng hợp KPI và nhân viên động (kèm các thay đổi chưa lưu)
  const { employeeStats, kpiSummary } = useMemo(() => {
    if (!sheetData) {
      return {
        employeeStats: [],
        kpiSummary: {
          totalStaff: 0,
          standardDays: 22,
          totalAbsent: 0,
          totalLeave: 0,
          totalBusinessTrip: 0,
          totalStudy: 0,
          totalSick: 0,
          totalMaternity: 0
        }
      }
    }

    let sumAbsent = 0
    let sumLeave = 0
    let sumBusinessTrip = 0
    let sumStudy = 0
    let sumSick = 0
    let sumMaternity = 0

    const stats: EmployeeStat[] = sheetData.employees.map((emp) => {
      let presentCount = 0
      let businessTripCount = 0
      let studyCount = 0
      let leaveCount = 0
      let sickCount = 0
      let maternityCount = 0
      let absentCount = 0

      // Xác định ngày chính thức thôi việc trong tháng
      let resignedDay: number | null = null
      if (emp.resignedAt) {
        const rDate = new Date(emp.resignedAt)
        if (rDate.getFullYear() === year && rDate.getMonth() + 1 === month) {
          resignedDay = rDate.getDate()
        } else if (rDate < new Date(year, month - 1, 1)) {
          resignedDay = 1
        }
      } else if (!emp.isActive) {
        resignedDay = 1
      }

      for (let d = 1; d <= sheetData.daysInMonth; d++) {
        if (resignedDay !== null && d >= resignedDay) {
          // Ô sau ngày thôi việc không tính công cũng không tính vắng
          continue
        }

        const status = getCellStatus(emp.id, d)
        if (status === 'ABSENT') absentCount += 1
        else if (status === 'LEAVE') leaveCount += 1
        else if (status === 'BUSINESS_TRIP') businessTripCount += 1
        else if (status === 'STUDY') studyCount += 1
        else if (status === 'SICK') sickCount += 1
        else if (status === 'MATERNITY') maternityCount += 1
        else if (status !== 'RESIGNED') presentCount += 1
      }

      sumAbsent += absentCount
      sumLeave += leaveCount
      sumBusinessTrip += businessTripCount
      sumStudy += studyCount
      sumSick += sickCount
      sumMaternity += maternityCount

      // Tính tổng công:
      // Nhân viên thôi việc giữa tháng: tổng công = số ngày làm việc thực tế (Có mặt + CT + Đi học)
      // Nhân viên làm việc bình thường: công chuẩn - ngày giảm trừ
      let totalWork = 0
      if (resignedDay !== null) {
        totalWork = presentCount + businessTripCount + studyCount
      } else {
        const deductedDays = absentCount + leaveCount + sickCount + maternityCount
        totalWork = Math.max(0, sheetData.sheet.standardDays - deductedDays)
      }

      return {
        ...emp,
        presentCount,
        businessTripCount,
        studyCount,
        leaveCount,
        sickCount,
        maternityCount,
        absentCount,
        totalWork
      }
    })

    return {
      employeeStats: stats,
      kpiSummary: {
        totalStaff: sheetData.employees.length,
        standardDays: sheetData.sheet.standardDays,
        totalAbsent: sumAbsent,
        totalLeave: sumLeave,
        totalBusinessTrip: sumBusinessTrip,
        totalStudy: sumStudy,
        totalSick: sumSick,
        totalMaternity: sumMaternity
      }
    }
  }, [sheetData, getCellStatus])

  const isLocked = sheetData?.sheet.status === 'LOCKED'
  const canEdit = !isLocked && initialUser.role !== 'BGD'
  const isAdmin = initialUser.role === 'ADMIN'

  // Thông tin tiêu đề và icon động theo Tab đang chọn từ Sidebar
  const tabInfo = useMemo(() => {
    switch (currentTab) {
      case 'employees':
        return {
          title: 'Quản Lý Hồ Sơ Nhân Sự',
          subtitle: `Khoa: ${sheetData?.department.name || '...'} • Danh mục hồ sơ nhân sự điều dưỡng & chức danh chuyên môn`,
          breadcrumb: 'Quản Lý Nhân Sự',
          icon: Users,
          iconBg: 'bg-[#EDECFB] dark:bg-[#202242]',
          iconColor: 'text-[#6B63DE] dark:text-[#8E87F5]'
        }
      case 'statistics':
        return {
          title: 'Thống Kê Chuyên Cần & Thi Đua',
          subtitle: `Khoa: ${sheetData?.department.name || '...'} • Phân tích tỷ lệ chuyên cần, ngày công thực tế và đánh giá thi đua`,
          breadcrumb: 'Thống Kê Chuyên Cần',
          icon: BarChart3,
          iconBg: 'bg-[#FFF8E6] dark:bg-[#2D2616]',
          iconColor: 'text-[#B7791F] dark:text-[#E0A838]'
        }
      case 'reports':
        return {
          title: 'Trung Tâm Báo Cáo & Xuất Dữ Liệu',
          subtitle: `Khoa: ${sheetData?.department.name || '...'} • Xuất file Excel chuẩn bệnh viện & theo dõi tiến độ chốt sổ các khoa`,
          breadcrumb: 'Báo Cáo & Xuất File',
          icon: FileSpreadsheet,
          iconBg: 'bg-[#EDECFB] dark:bg-[#202242]',
          iconColor: 'text-[#6B63DE] dark:text-[#8E87F5]'
        }
      case 'timesheet':
      default:
        return {
          title: 'Bảng Chấm Công Điều Dưỡng',
          subtitle: `Khoa: ${sheetData?.department.name || '...'} • Quản lý công cán bộ & theo dõi vắng/phép hàng ngày`,
          breadcrumb: 'Bảng Chấm Công',
          icon: CalendarCheck,
          iconBg: 'bg-[#EAFBF1] dark:bg-[#152B1E]',
          iconColor: 'text-[#1E9E52] dark:text-[#34C759]'
        }
    }
  }, [currentTab, sheetData?.department.name])

  const TabHeaderIcon = tabInfo.icon

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Toast thông báo */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-[#1E2038] border-l-4 border-[#1E9E52] text-[#1F2050] dark:text-[#F0F1F9] px-4 py-3 rounded-[12px] shadow-[0_12px_32px_rgba(31,32,80,0.18)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)] flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-[#1E9E52] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Thanh công cụ đầu trang tinh gọn (Compact Top Toolbar) */}
      <Card className="p-3 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-3 border border-[#E8E8F2] dark:border-[#2A2C49]">
        {/* Nhóm trái: Bộ chọn Tháng / Năm & Tên Khoa */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Bộ chọn Tháng / Năm */}
          <div className="flex items-center gap-1.5 bg-[#F6F7FB] dark:bg-[#1E2038] p-1 rounded-[12px] border border-[#E8E8F2] dark:border-[#2A2C49]">
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="h-8 px-2.5 rounded-[8px] text-xs font-bold text-[#1F2050] dark:text-[#F0F1F9] bg-white dark:bg-[#18192E] border border-[#E8E8F2] dark:border-[#2A2C49] cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="h-8 px-2.5 rounded-[8px] text-xs font-bold text-[#1F2050] dark:text-[#F0F1F9] bg-white dark:bg-[#18192E] border border-[#E8E8F2] dark:border-[#2A2C49] cursor-pointer"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          {/* Chọn khoa (đối với Admin và BGD) hoặc Tag hiển thị khoa */}
          {initialUser.role !== 'KHOA_USER' && sheetData?.departments ? (
            <select
              value={selectedDeptId || ''}
              onChange={(e) => setSelectedDeptId(parseInt(e.target.value, 10))}
              className="h-8 px-3 rounded-[10px] text-xs font-bold text-[#1F2050] dark:text-[#F0F1F9] bg-[#F6F7FB] dark:bg-[#1E2038] border border-[#E8E8F2] dark:border-[#2A2C49] cursor-pointer shadow-2xs"
            >
              {sheetData.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  [{d.code}] {d.name}
                </option>
              ))}
            </select>
          ) : (
            sheetData?.department && (
              <span className="text-xs font-bold text-[#5A5B7C] dark:text-[#A3A6C4] px-3 py-1.5 rounded-[10px] bg-[#F6F7FB] dark:bg-[#1E2038] border border-[#E8E8F2] dark:border-[#2A2C49]">
                Khoa: <span className="text-[#1F2050] dark:text-[#F0F1F9] font-extrabold">{sheetData.department.name}</span>
              </span>
            )
          )}
        </div>

        {/* Nhóm phải: Trạng thái đang mở / đã khoá + Lịch sử sửa đổi + Khoá/Mở khoá */}
        <div className="flex items-center gap-2">
          {/* Trạng thái khoá sổ */}
          {sheetData && (
            <div title={isLocked ? `Đã khoá bởi ${sheetData.sheet.lockedBy?.name || 'Quản trị viên'}` : 'Đang mở chấm công'}>
              {isLocked ? (
                <Badge variant="warning" className="h-8 px-3 gap-1.5 font-bold text-xs">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Đã khoá sổ</span>
                </Badge>
              ) : (
                <Badge variant="success" className="h-8 px-3 gap-1.5 font-bold text-xs">
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Đang mở</span>
                </Badge>
              )}
            </div>
          )}

          {/* Nút Xem Lịch Sử Sửa Đổi */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsAuditModalOpen(true)}
            className="font-bold gap-1.5 h-8 text-xs cursor-pointer"
            title="Xem nhật ký lịch sử chỉnh sửa các ô chấm công"
          >
            <History className="w-3.5 h-3.5 text-[#5A5B7C] dark:text-[#A3A6C4]" />
            <span>Lịch sử sửa đổi</span>
          </Button>

          {/* Nút Khoá sổ / Mở khoá khi ở Tab Bảng chấm công */}
          {currentTab === 'timesheet' && (
            <>
              {!isLocked && canEdit && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleLock}
                  disabled={isLocking}
                  className="font-bold gap-1.5 h-8 text-xs text-[#B7791F] dark:text-[#E0A838] cursor-pointer"
                  title="Khoá sổ bảng chấm công tháng này"
                >
                  {isLocking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>Khoá sổ</span>
                </Button>
              )}

              {isLocked && isAdmin && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleUnlock}
                  disabled={isLocking}
                  className="font-bold gap-1.5 h-8 text-xs text-[#1E9E52] dark:text-[#34C759] cursor-pointer"
                  title="Mở khoá bảng chấm công"
                >
                  {isLocking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>Mở khoá</span>
                </Button>
              )}
            </>
          )}
        </div>
      </Card>

      {/* THANH ĐIỀU HƯỚNG TAB RÚT GỌN TRÊN MOBILE (Desktop đã đưa ra Sidebar) */}
      <div className="flex lg:hidden items-center gap-2 p-1.5 bg-[#E8EAF4] dark:bg-[#1A1C30] rounded-[18px] border border-[#D5D7E8] dark:border-[#2A2C49] overflow-x-auto scrollbar-thin">
        {/* Tab 1: Bảng Chấm Công */}
        <button
          type="button"
          onClick={() => setTab('timesheet')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-[12px] text-xs font-bold transition cursor-pointer shrink-0 ${
            currentTab === 'timesheet'
              ? 'bg-white dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] shadow-xs'
              : 'text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#1F2050] dark:hover:text-white'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Bảng Chấm Công</span>
        </button>

        {/* Tab 2: Quản Lý Nhân Sự */}
        <button
          type="button"
          onClick={() => setTab('employees')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-[12px] text-xs font-bold transition cursor-pointer shrink-0 ${
            currentTab === 'employees'
              ? 'bg-white dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] shadow-xs'
              : 'text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#1F2050] dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Nhân Sự</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#EDECFB] dark:bg-[#18192E] text-[#6B63DE] dark:text-[#8E87F5]">
            {allDepartmentEmployees.length}
          </span>
        </button>

        {/* Tab 3: Thống Kê Chuyên Cần */}
        <button
          type="button"
          onClick={() => setTab('statistics')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-[12px] text-xs font-bold transition cursor-pointer shrink-0 ${
            currentTab === 'statistics'
              ? 'bg-white dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] shadow-xs'
              : 'text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#1F2050] dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Thống Kê</span>
        </button>

        {/* Tab 4: Báo Cáo & Xuất Dữ Liệu */}
        <button
          type="button"
          onClick={() => setTab('reports')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-[12px] text-xs font-bold transition cursor-pointer shrink-0 ${
            currentTab === 'reports'
              ? 'bg-white dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] shadow-xs'
              : 'text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#1F2050] dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Báo Cáo &amp; Xuất File</span>
        </button>
      </div>

      {/* Trạng thái Loading hoặc Lỗi */}
      {loading ? (
        <Card className="p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 text-[#6B63DE] dark:text-[#8E87F5] animate-spin" />
          <span className="text-xs font-bold text-[#5A5B7C] dark:text-[#A3A6C4]">
            Đang tải dữ liệu phân hệ Tháng {month}/{year}...
          </span>
        </Card>
      ) : error ? (
        <Card className="p-8 text-center text-[#C53030] dark:text-[#FF6B6B] space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="text-sm font-bold">{error}</p>
          <button
            type="button"
            onClick={fetchSheet}
            className="px-4 py-2 rounded-[10px] bg-[#EDEEF5] dark:bg-[#1E2038] text-xs font-bold text-[#1F2050] dark:text-[#F0F1F9] cursor-pointer"
          >
            Tải lại
          </button>
        </Card>
      ) : sheetData && (
        <>
          {/* NỘI DUNG TỪNG TAB */}
          {currentTab === 'timesheet' && (
            <TimesheetTab
              sheetData={sheetData}
              employeeStats={employeeStats}
              kpiSummary={kpiSummary}
              holidayMap={holidayMap}
              dirtyRecords={dirtyRecords}
              getCellStatus={getCellStatus}
              onCellCycle={handleCellCycle}
              onSetStatus={handleSetStatus}
              canEdit={canEdit}
              isLocked={isLocked}
              isAdmin={isAdmin}
              isSaving={isSaving}
              isLocking={isLocking}
              onSave={handleSave}
              onDiscard={handleDiscard}
              onLock={handleLock}
              onUnlock={handleUnlock}
              onOpenAuditModal={() => setIsAuditModalOpen(true)}
              month={month}
              year={year}
            />
          )}

          {currentTab === 'employees' && (
            <EmployeeManagementTab
              employees={allDepartmentEmployees}
              departmentName={sheetData.department.name}
              departmentId={sheetData.department.id}
              canEdit={canEdit}
              onAddClick={() => setIsAddModalOpen(true)}
              onEditClick={(emp) => setEditingEmployee(emp)}
              onDeleteClick={(emp) => setDeleteTargetEmployee(emp)}
              onRefresh={fetchSheet}
              showToast={showToast}
            />
          )}

          {currentTab === 'statistics' && (
            <AttendanceStatisticsTab
              employeeStats={employeeStats}
              standardDays={sheetData.sheet.standardDays}
              departmentName={sheetData.department.name}
              month={month}
              year={year}
            />
          )}

          {currentTab === 'reports' && (
            <AttendanceReportsTab
              currentDeptId={sheetData.department.id}
              currentDeptCode={sheetData.department.code}
              currentDeptName={sheetData.department.name}
              month={month}
              year={year}
              userRole={initialUser.role || 'KHOA_USER'}
              onSelectDepartment={(deptId) => setSelectedDeptId(deptId)}
            />
          )}
        </>
      )}

      {/* Các Modals */}
      {sheetData && (
        <>
          <AddEmployeeModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSuccess={handleAddEmployeeSuccess}
            departmentId={sheetData.department.id}
            departmentName={sheetData.department.name}
          />

          <EditEmployeeModal
            isOpen={Boolean(editingEmployee)}
            onClose={() => setEditingEmployee(null)}
            onSuccess={handleEditEmployeeSuccess}
            employee={editingEmployee}
            departmentName={sheetData.department.name}
          />

          <DeleteEmployeeModal
            isOpen={Boolean(deleteTargetEmployee)}
            onClose={() => setDeleteTargetEmployee(null)}
            onSuccess={handleDeleteEmployeeSuccess}
            employee={deleteTargetEmployee}
          />

          <AttendanceAuditModal
            isOpen={isAuditModalOpen}
            onClose={() => setIsAuditModalOpen(false)}
            sheetId={sheetData.sheet.id}
            month={month}
            year={year}
            departmentName={sheetData.department.name}
          />
        </>
      )}
    </div>
  )
}
