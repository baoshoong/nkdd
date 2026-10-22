'use client'

import { Fragment, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import {
  Check,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Sparkles,
  RefreshCw,
  Radio,
  GripVertical,
  Search,
  X,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SyncedHorizontalScroll } from '@/components/ui/SyncedHorizontalScroll'
import { useTableDragScroll } from '@/lib/hooks/use-table-drag-scroll'
import { getShortDeptName } from '@/lib/department-utils'
import { cn } from '@/lib/theme/cn'

interface DepartmentItem {
  id: number
  code: string
  name: string
  isTotal: boolean
  sortOrder: number
}

interface IndicatorItem {
  id: number
  code: string
  name: string
  groupName: string
  canEdit: boolean
}

interface ReportResponse {
  reportDate: string
  status: 'OPEN' | 'LOCKED' | string
  myDepartmentId: number | null
  myRole: 'ADMIN' | 'BGD' | 'KHOA_USER' | string
  departments: DepartmentItem[]
  indicators: IndicatorItem[]
  matrix: Record<number, Record<number, number>>
}

interface ReportTableProps {
  date: string
}

const MULTI_CLIENT_CHANNEL = 'nkdd-multi-client'

// Chuẩn hóa chuỗi tiếng Việt không dấu để tìm kiếm nhanh cả có dấu lẫn không dấu
function normalizeVietnamese(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

export default function ReportTable({ date }: ReportTableProps) {
  const [data, setData] = useState<ReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // State tìm kiếm & lọc khu vực (nhóm chỉ số)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL')
  const [onlyEmpty, setOnlyEmpty] = useState(false)

  // Multi-client sync state
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)

  // dirty: lưu giá trị người dùng chỉnh sửa [key: `${deptId}_${indId}`] => newValue
  const [dirty, setDirty] = useState<Record<string, number>>({})

  // Ref container cuộn của bảng ma trận
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Hook kéo cuộn bảng bằng cách giữ chuột trái ở mép cột hoặc thanh tiêu đề
  const { isDragging, dragProps } = useTableDragScroll(tableContainerRef)

  // Fetch / Sync dữ liệu báo cáo theo ngày
  const syncData = useCallback(
    async (isBackground = false) => {
      try {
        if (!isBackground) {
          setLoading(true)
          setError(null)
        }
        setIsSyncing(true)

        const res = await fetch(`/api/reports?date=${date}`)
        if (!res.ok) {
          if (!isBackground) {
            const errJson = await res.json().catch(() => ({}))
            throw new Error(errJson.error || 'Không thể tải dữ liệu báo cáo')
          }
          return
        }

        const json: ReportResponse = await res.json()
        setData(json)

        // Nếu tải lần đầu (không phải background), xóa dirty state
        if (!isBackground) {
          setDirty({})
        }

        const now = new Date()
        const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes()
        ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
        setLastSynced(formattedTime)

        // Bắn sự kiện lên Topbar (Navbar) để cập nhật badge thời gian thực
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('report-synced', { detail: { time: formattedTime } })
          )
        }
      } catch (err) {
        if (!isBackground) {
          setError(err instanceof Error ? err.message : 'Lỗi hệ thống')
        }
      } finally {
        if (!isBackground) {
          setLoading(false)
        }
        setIsSyncing(false)
      }
    },
    [date]
  )

  // Fetch ban đầu khi đổi ngày
  useEffect(() => {
    if (date) {
      syncData(false)
    }
  }, [date, syncData])

  // Multi-Client 1: Tự động polling ngầm mỗi 15 giây khi tab đang hiển thị
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncData(true)
      }
    }, 15000)

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        syncData(true)
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [syncData])

  // Multi-Client 2: Lắng nghe thông điệp tức thì giữa các tab/cửa sổ qua BroadcastChannel & sự kiện Navbar
  useEffect(() => {
    let channel: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel(MULTI_CLIENT_CHANNEL)
      channel.onmessage = (event) => {
        if (
          (event.data?.type === 'REPORT_UPDATED' && event.data?.date === date) ||
          event.data?.type === 'REQUEST_SYNC'
        ) {
          syncData(true)
        }
      }
    }

    const handleCustomUpdate = () => {
      syncData(true)
    }
    window.addEventListener('report-updated', handleCustomUpdate)
    window.addEventListener('request-sync', handleCustomUpdate)

    return () => {
      channel?.close()
      window.removeEventListener('report-updated', handleCustomUpdate)
      window.removeEventListener('request-sync', handleCustomUpdate)
    }
  }, [date, syncData])

  // Nhóm indicators theo groupName
  const groups = useMemo(() => {
    if (!data?.indicators) return []
    const map = new Map<string, IndicatorItem[]>()
    for (const ind of data.indicators) {
      if (!map.has(ind.groupName)) {
        map.set(ind.groupName, [])
      }
      map.get(ind.groupName)!.push(ind)
    }
    return Array.from(map.entries()).map(([groupName, indicators]) => ({
      groupName,
      indicators
    }))
  }, [data?.indicators])

  // Lọc danh sách khoa hiển thị: ADMIN/BGD -> tất cả 12 cột; KHOA_USER -> CHỈ khoa của mình (ẨN CỘT TỔNG ĐỂ TRÁNH HIỂU SAI)
  const visibleDepts = useMemo(() => {
    if (!data?.departments) return []
    if (data.myRole === 'ADMIN' || data.myRole === 'BGD') {
      return data.departments
    }
    return data.departments.filter(
      (d) => d.id === data.myDepartmentId
    )
  }, [data?.departments, data?.myRole, data?.myDepartmentId])

  const isSingleDept = visibleDepts.length === 1
  const singleDept = isSingleDept ? visibleDepts[0] : null

  // Lấy giá trị hiện thời: ưu tiên local dirty của client này, sau đó matrix
  const getCellValue = useCallback(
    (deptId: number, indId: number): number => {
      const key = `${deptId}_${indId}`
      if (dirty[key] !== undefined) {
        return dirty[key]
      }
      return data?.matrix?.[deptId]?.[indId] ?? 0
    },
    [dirty, data?.matrix]
  )

  // Lọc danh sách nhóm & chỉ số theo từ khóa tìm kiếm, khu vực (nhóm) và trạng thái chưa nhập
  const filteredGroups = useMemo(() => {
    if (!groups.length) return []
    const q = normalizeVietnamese(searchQuery)

    return groups
      .filter((g) => selectedGroup === 'ALL' || g.groupName === selectedGroup)
      .map((g) => {
        const matchedIndicators = g.indicators.filter((ind) => {
          if (q) {
            const nameNorm = normalizeVietnamese(ind.name)
            const codeNorm = normalizeVietnamese(ind.code)
            const groupNorm = normalizeVietnamese(g.groupName)
            if (!nameNorm.includes(q) && !codeNorm.includes(q) && !groupNorm.includes(q)) {
              return false
            }
          }

          if (onlyEmpty) {
            if (isSingleDept && singleDept) {
              if (getCellValue(singleDept.id, ind.id) !== 0) return false
            } else if (data?.departments) {
              const totalDept = data.departments.find((d) => d.isTotal)
              if (totalDept && getCellValue(totalDept.id, ind.id) !== 0) return false
            }
          }

          return true
        })

        return {
          groupName: g.groupName,
          indicators: matchedIndicators
        }
      })
      .filter((g) => g.indicators.length > 0)
  }, [groups, searchQuery, selectedGroup, onlyEmpty, isSingleDept, singleDept, data?.departments, getCellValue])

  const totalIndicatorsCount = data?.indicators?.length ?? 0
  const filteredIndicatorsCount = useMemo(
    () => filteredGroups.reduce((acc, g) => acc + g.indicators.length, 0),
    [filteredGroups]
  )
  const hasActiveFilter = searchQuery.trim() !== '' || selectedGroup !== 'ALL' || onlyEmpty

  // Phân chia danh sách chỉ số làm 2 cột cân đối khi khoa phòng nhập báo cáo (Side-by-Side 2 Tables)
  const { leftGroups, rightGroups } = useMemo(() => {
    if (!filteredGroups.length) return { leftGroups: [], rightGroups: [] }
    if (!isSingleDept) return { leftGroups: filteredGroups, rightGroups: [] }

    const totalCount = filteredGroups.reduce((acc, g) => acc + g.indicators.length, 0)
    // Nếu tổng số chỉ số ít (<= 4), chỉ hiển thị 1 bảng gọn gàng ở giữa
    if (totalCount <= 4) {
      return { leftGroups: filteredGroups, rightGroups: [] }
    }

    // Nếu chỉ có 1 nhóm duy nhất nhưng có >= 5 chỉ số, chia đôi danh sách chỉ số trong nhóm
    if (filteredGroups.length === 1) {
      const g = filteredGroups[0]
      const half = Math.ceil(g.indicators.length / 2)
      return {
        leftGroups: [{ groupName: g.groupName, indicators: g.indicators.slice(0, half) }],
        rightGroups: [{ groupName: `${g.groupName} (tiếp)`, indicators: g.indicators.slice(half) }]
      }
    }

    // Nhiều hơn 1 nhóm: chia đều theo số lượng chỉ số
    const targetHalf = Math.ceil(totalCount / 2)
    const left: typeof filteredGroups = []
    const right: typeof filteredGroups = []
    let currentLeftCount = 0

    for (const g of filteredGroups) {
      if (left.length === 0 || currentLeftCount + g.indicators.length <= targetHalf + 1) {
        left.push(g)
        currentLeftCount += g.indicators.length
      } else {
        right.push(g)
      }
    }

    // Đảm bảo cả 2 cột đều có dữ liệu nếu có từ 2 nhóm trở lên
    if (right.length === 0 && left.length > 1) {
      right.push(left.pop()!)
    }

    return { leftGroups: left, rightGroups: right }
  }, [filteredGroups, isSingleDept])

  const isLocked = data?.status === 'LOCKED'

  // Kiểm tra ô có được phép nhập không
  const canEditCell = (d: DepartmentItem, ind: IndicatorItem) => {
    if (isLocked || d.isTotal || !ind.canEdit) {
      return false
    }
    if (data?.myRole === 'ADMIN') {
      return true
    }
    return d.id === data?.myDepartmentId
  }

  // Cập nhật giá trị dirty
  const handleCellChange = (deptId: number, indId: number, valStr: string) => {
    const key = `${deptId}_${indId}`
    const num = valStr === '' ? 0 : Math.max(0, Number(valStr) || 0)
    setDirty((prev) => ({
      ...prev,
      [key]: num
    }))
  }

  // Số lượng ô đã chỉnh sửa
  const dirtyCount = Object.keys(dirty).length

  // Lưu các ô đang chỉnh sửa lên server
  const handleSave = async () => {
    if (dirtyCount === 0 || !data) return
    setSaving(true)
    setError(null)
    setToast(null)

    try {
      // Gom nhóm theo departmentId
      const byDept: Record<number, Array<{ indicatorId: number; value: number }>> = {}
      for (const [key, value] of Object.entries(dirty)) {
        const [deptIdStr, indIdStr] = key.split('_')
        const deptId = Number(deptIdStr)
        const indId = Number(indIdStr)
        if (!byDept[deptId]) {
          byDept[deptId] = []
        }
        byDept[deptId].push({ indicatorId: indId, value })
      }

      // Gửi PUT request cho từng khoa có thay đổi
      for (const [deptIdStr, values] of Object.entries(byDept)) {
        const deptId = Number(deptIdStr)
        const payload: {
          date: string
          departmentId?: number
          values: Array<{ indicatorId: number; value: number }>
        } = {
          date,
          values
        }
        if (data.myRole === 'ADMIN') {
          payload.departmentId = deptId
        }

        const res = await fetch('/api/reports/values', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}))
          throw new Error(errJson.error || 'Lỗi khi lưu dữ liệu')
        }
      }

      setToast('Đã lưu dữ liệu báo cáo thành công!')
      setTimeout(() => setToast(null), 3500)

      // Multi-Client Broadcast: Bắn tin hiệu cho các tab/máy khách khác đồng bộ tức thì
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('report-updated'))
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel(MULTI_CLIENT_CHANNEL)
          channel.postMessage({ type: 'REPORT_UPDATED', date })
          channel.close()
        }
      }

      await syncData(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu')
    } finally {
      setSaving(false)
    }
  }

  // Render bảng nhập liệu tinh gọn cho khoa phòng (hỗ trợ hiển thị 2 bảng song song - Side-by-Side)
  const renderSingleDeptTable = (groupList: typeof groups, keyPrefix: string) => {
    if (!singleDept) return null
    return (
      <div className="relative border border-[#E8E8F2] dark:border-[#2A2C49] rounded-[20px] overflow-hidden bg-white dark:bg-[#18192E] shadow-[0_4px_20px_rgba(100,100,180,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="max-h-[calc(100vh-230px)] min-h-[300px] overflow-auto scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-[#F6F7FB] dark:bg-[#1E2038] z-20 shadow-2xs">
              <tr className="border-b border-[#E8E8F2] dark:border-[#2A2C49]">
                <th className="px-3.5 py-2.5 font-bold text-[#1F2050] dark:text-[#F0F1F9] border-r-2 border-[#D4D5E4] dark:border-[#3E4268] bg-[#F6F7FB] dark:bg-[#1E2038] uppercase tracking-wider text-[11px] select-none">
                  CHỈ SỐ BÁO CÁO
                </th>
                <th className="px-3 py-2.5 w-[140px] min-w-[140px] max-w-[150px] font-bold text-center border-r border-[#E8E8F2] dark:border-[#2A2C49] tracking-tight select-none bg-[#F2F2FD] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5]">
                  <div className="flex flex-col items-center pointer-events-none">
                    <span className="font-bold text-xs truncate max-w-[130px]">
                      {singleDept.name}
                    </span>
                    <span className="text-[9px] font-mono opacity-65">
                      [{singleDept.code}]
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8F2] dark:divide-[#2A2C49]">
              {groupList.map(({ groupName, indicators }) => (
                <Fragment key={`${keyPrefix}_${groupName}`}>
                  <tr className="bg-[#EFF0F9] dark:bg-[#202242] border-y border-[#D4D5E4] dark:border-[#3E4268]">
                    <td
                      colSpan={2}
                      className="px-3.5 py-2 font-bold text-[#1F2050] dark:text-[#8E87F5] uppercase tracking-wider text-[11px] bg-[#EFF0F9] dark:bg-[#202242]"
                    >
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#6B63DE] dark:text-[#8E87F5]" />
                        <span>{groupName}</span>
                      </div>
                    </td>
                  </tr>
                  {indicators.map((ind) => {
                    const editable = canEditCell(singleDept, ind)
                    const val = getCellValue(singleDept.id, ind.id)
                    const isEdited = dirty[`${singleDept.id}_${ind.id}`] !== undefined

                    return (
                      <tr
                        key={ind.id}
                        className="hover:bg-[#F0F1F9] dark:hover:bg-[#242744] transition-colors duration-150"
                      >
                        <td className="px-3.5 py-2 font-semibold text-[#1F2050] dark:text-[#F0F1F9] border-r-2 border-[#D4D5E4] dark:border-[#3E4268] bg-white dark:bg-[#18192E] text-xs">
                          <div className="flex items-center justify-between gap-2 pr-1">
                            <span>{ind.name}</span>
                            {ind.canEdit && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-[#6B63DE] dark:bg-[#8E87F5] shrink-0"
                                title="Chỉ số bạn được phân quyền nhập"
                              />
                            )}
                          </div>
                        </td>
                        <td
                          className={cn(
                            'p-1.5 border-r border-[#E8E8F2] dark:border-[#2A2C49] transition-colors duration-150 w-[140px] min-w-[140px] max-w-[150px] text-center',
                            isEdited
                              ? 'bg-[#EDECFB]/50 dark:bg-[#282B52]/50'
                              : 'bg-[#F2F2FD]/20 dark:bg-[#202242]/10'
                          )}
                        >
                          {editable ? (
                            <div className="flex items-center justify-center">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={val === 0 && !dirty[`${singleDept.id}_${ind.id}`] ? '' : val}
                                onChange={(e) =>
                                  handleCellChange(singleDept.id, ind.id, e.target.value)
                                }
                                placeholder="0"
                                className={cn(
                                  'w-28 h-8 px-2 text-center font-mono font-bold text-sm tabular-nums rounded-[8px] transition-all duration-150',
                                  'border border-[#D4D5E4] dark:border-[#3E4268] bg-white dark:bg-[#1E2038] text-[#1F2050] dark:text-[#F0F1F9]',
                                  'focus:outline-none focus:border-[#6B63DE] focus:ring-2 focus:ring-[#6B63DE]/30 dark:focus:border-[#8E87F5] dark:focus:ring-[#8E87F5]/30',
                                  isEdited &&
                                    'border-[#6B63DE] dark:border-[#8E87F5] bg-[#EDECFB] dark:bg-[#282B52]'
                                )}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-8 font-mono text-xs text-[#8A8BA0] dark:text-[#6C6F93]">
                              {val !== 0 ? val.toLocaleString('vi-VN') : '-'}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 bg-white dark:bg-[#18192E] rounded-[20px] border border-[#E8E8F2] dark:border-[#2A2C49] shadow-[0_4px_20px_rgba(100,100,180,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3 text-[#5A5B7C] dark:text-[#A3A6C4] font-semibold text-sm">
          <Loader2 className="w-5 h-5 text-[#6B63DE] dark:text-[#8E87F5] animate-spin" />
          Đang tải dữ liệu ma trận báo cáo...
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-6 bg-[#FDECEC] dark:bg-[#3D1E24] border border-[#C53030]/20 dark:border-[#C53030]/30 rounded-[20px] text-[#C53030] dark:text-[#FF6B6B] flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <Button variant="danger" size="sm" onClick={() => syncData(false)}>
          Thử lại
        </Button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-3.5 relative">
      {/* Toast thông báo */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-[#18192E] border-l-4 border-[#1E9E52] text-[#1F2050] dark:text-[#F0F1F9] px-4 py-3 rounded-[12px] shadow-[0_12px_32px_rgba(31,32,80,0.12)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)] border border-transparent dark:border-[#2A2C49] flex items-center gap-2.5 text-xs font-bold transition-transform duration-250 ease-out animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-[#1E9E52] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Thanh công cụ Tìm kiếm chỉ số & Chọn khu vực nhập (nhóm chỉ số) */}
      <div
        className={cn(
          'bg-white dark:bg-[#18192E] border border-[#E8E8F2] dark:border-[#2A2C49] rounded-[16px] p-3 sm:p-3.5 shadow-[0_2px_12px_rgba(100,100,180,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] space-y-2.5',
          isSingleDept ? 'max-w-[1440px] mx-auto' : 'w-full'
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Ô tìm kiếm từ khóa */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#8A8BA0] dark:text-[#6C6F93] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh chỉ số hoặc khu vực nhập (VD: điều dưỡng, thở máy, cấp 1...)"
              className="w-full h-9 pl-9 pr-8 rounded-[10px] text-xs font-medium bg-[#F6F7FB] dark:bg-[#1E2038] border border-[#E8E8F2] dark:border-[#2A2C49] text-[#1F2050] dark:text-[#F0F1F9] placeholder-[#8A8BA0] dark:placeholder-[#6C6F93] focus:outline-none focus:border-[#6B63DE] focus:ring-2 focus:ring-[#6B63DE]/20 dark:focus:border-[#8E87F5] transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                title="Xóa từ khóa tìm kiếm"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8BA0] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Bộ lọc nhanh trạng thái chưa nhập & Thống kê số lượng chỉ số */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOnlyEmpty((prev) => !prev)}
              className={cn(
                'h-8 px-3 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer select-none',
                onlyEmpty
                  ? 'bg-[#FFF6E0] dark:bg-[#2D2616] border-[#FFB020]/50 text-[#B7791F] dark:text-[#E0A838]'
                  : 'bg-[#F6F7FB] dark:bg-[#1E2038] border-[#E8E8F2] dark:border-[#2A2C49] text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#1F2050] dark:hover:text-[#F0F1F9]'
              )}
              title="Chỉ hiển thị các mục đang có giá trị bằng 0 (chưa nhập)"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Chưa nhập (= 0)</span>
            </button>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedGroup('ALL')
                  setOnlyEmpty(false)
                }}
                className="h-8 px-2.5 rounded-[10px] text-xs font-semibold text-[#C53030] dark:text-[#FF6B6B] hover:bg-[#FDECEC] dark:hover:bg-[#3D1E24] transition cursor-pointer select-none flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Bỏ lọc</span>
              </button>
            )}

            <span className="text-[11px] font-semibold text-[#8A8BA0] dark:text-[#6C6F93] ml-auto sm:ml-1">
              Hiển thị{' '}
              <strong className="text-[#1F2050] dark:text-[#F0F1F9] tabular-nums">
                {filteredIndicatorsCount}
              </strong>
              /{totalIndicatorsCount} chỉ số
            </span>
          </div>
        </div>

        {/* Các pill chọn nhanh Khu vực / Nhóm chỉ số */}
        {groups.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#E8E8F2]/70 dark:border-[#2A2C49]/70">
            <span className="text-[11px] font-bold text-[#8A8BA0] dark:text-[#6C6F93] mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#6B63DE] dark:text-[#8E87F5]" />
              <span>Khu vực nhập:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedGroup('ALL')}
              className={cn(
                'px-2.5 py-1 rounded-[8px] text-[11px] font-bold transition cursor-pointer select-none',
                selectedGroup === 'ALL'
                  ? 'bg-[#6B63DE] text-white shadow-2xs'
                  : 'bg-[#F6F7FB] dark:bg-[#1E2038] text-[#5A5B7C] dark:text-[#A3A6C4] hover:bg-[#EDECFB] dark:hover:bg-[#242744] hover:text-[#6B63DE] dark:hover:text-[#8E87F5]'
              )}
            >
              Tất cả ({totalIndicatorsCount})
            </button>

            {groups.map((g) => {
              const active = selectedGroup === g.groupName
              return (
                <button
                  key={g.groupName}
                  type="button"
                  onClick={() =>
                    setSelectedGroup(active ? 'ALL' : g.groupName)
                  }
                  className={cn(
                    'px-2.5 py-1 rounded-[8px] text-[11px] font-bold transition cursor-pointer select-none flex items-center gap-1',
                    active
                      ? 'bg-[#6B63DE] text-white shadow-2xs'
                      : 'bg-[#F6F7FB] dark:bg-[#1E2038] text-[#5A5B7C] dark:text-[#A3A6C4] hover:bg-[#EDECFB] dark:hover:bg-[#242744] hover:text-[#6B63DE] dark:hover:text-[#8E87F5]'
                  )}
                >
                  <span>{g.groupName}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1 rounded-full tabular-nums',
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-[#E8E8F2]/80 dark:bg-[#2A2C49] text-[#5A5B7C] dark:text-[#A3A6C4]'
                    )}
                  >
                    {g.indicators.length}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Thanh cuộn ngang phụ trên nóc bảng (chỉ hiện khi có nhiều khoa phòng - Admin/BGD) */}
      {visibleDepts.length > 1 && (
        <SyncedHorizontalScroll
          tableContainerRef={tableContainerRef}
          label="Cuộn ngang để xem tất cả cột khoa phòng"
        />
      )}

      {/* Trạng thái không có chỉ số nào khớp bộ lọc tìm kiếm */}
      {filteredGroups.length === 0 ? (
        <div
          className={cn(
            'p-10 bg-white dark:bg-[#18192E] border border-[#E8E8F2] dark:border-[#2A2C49] rounded-[20px] text-center space-y-3',
            isSingleDept ? 'max-w-[1440px] mx-auto' : 'w-full'
          )}
        >
          <p className="text-sm font-bold text-[#1F2050] dark:text-[#F0F1F9]">
            Không tìm thấy chỉ số báo cáo nào phù hợp
          </p>
          <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4]">
            Thử từ khóa khác hoặc xóa bộ lọc khu vực hiện tại để xem toàn bộ chỉ số.
          </p>
          {hasActiveFilter && (
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedGroup('ALL')
                  setOnlyEmpty(false)
                }}
              >
                Hiển thị tất cả chỉ số
              </Button>
            </div>
          )}
        </div>
      ) : isSingleDept ? (
        /* Khi chỉ có 1 khoa phòng (KHOA_USER): Hiển thị 2 bảng song song (Side-by-Side) */
        rightGroups.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-[1440px] mx-auto items-start">
            {renderSingleDeptTable(leftGroups, 'left')}
            {renderSingleDeptTable(rightGroups, 'right')}
          </div>
        ) : (
          <div className="max-w-[700px] mx-auto">
            {renderSingleDeptTable(leftGroups, 'single')}
          </div>
        )
      ) : (
        /* Bảng ma trận 12 cột cho ADMIN / BGD */
        <div className="relative border border-[#E8E8F2] dark:border-[#2A2C49] rounded-[20px] overflow-hidden bg-white dark:bg-[#18192E] shadow-[0_4px_20px_rgba(100,100,180,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] w-full">
          <div
            ref={tableContainerRef}
            className="max-h-[calc(100vh-230px)] min-h-[350px] overflow-auto scrollbar-thin"
          >
            <table className="w-full text-xs text-left border-collapse">
              {/* Header cố định */}
              <thead className="sticky top-0 bg-[#F6F7FB] dark:bg-[#1E2038] z-20 shadow-2xs">
                <tr className="border-b border-[#E8E8F2] dark:border-[#2A2C49] hover:bg-transparent">
                  {/* Cột chỉ số đầu tiên: dùng <th> với sticky left-0 bg-card z-30 để chống mất sticky */}
                  <th className="px-3.5 py-2.5 font-bold text-[#1F2050] dark:text-[#F0F1F9] border-r-2 border-[#D4D5E4] dark:border-[#3E4268] min-w-[260px] bg-[#F6F7FB] dark:bg-[#1E2038] sticky left-0 z-30 uppercase tracking-wider text-[11px] relative select-none">
                    <div className="flex items-center justify-between pr-2">
                      <span>CHỈ SỐ BÁO CÁO</span>
                      {visibleDepts.length > 1 && (
                        <span className="text-[10px] font-normal text-[#8A8BA0] dark:text-[#6C6F93] flex items-center gap-0.5" title="Nhấn giữ chuột trái tại mép cột để cuộn ngang">
                          <GripVertical className="w-3.5 h-3.5 text-[#6B63DE] dark:text-[#8E87F5]" />
                        </span>
                      )}
                    </div>
                    {/* Dải kéo chuột trái ở mép ngoài cùng của cột */}
                    {visibleDepts.length > 1 && (
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
                    )}
                  </th>
                  {visibleDepts.map((d) => (
                    <th
                      key={d.id}
                      {...dragProps}
                      title={d.name}
                      className={cn(
                        'font-bold text-center border-r border-[#E8E8F2] dark:border-[#2A2C49] tracking-tight select-none transition-colors px-1 py-2 min-w-[68px] w-[72px] cursor-grab active:cursor-grabbing',
                        d.isTotal
                          ? 'bg-[#FFF6E0] dark:bg-[#2D2616] text-[#B7791F] dark:text-[#E0A838] font-extrabold'
                          : d.id === data.myDepartmentId
                          ? 'bg-[#F2F2FD] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5]'
                          : 'text-[#1F2050] dark:text-[#F0F1F9] bg-[#F6F7FB] dark:bg-[#1E2038]'
                      )}
                    >
                      <div className="flex flex-col items-center pointer-events-none">
                        <span className="font-bold text-[11px] leading-tight truncate max-w-[68px]">
                          {getShortDeptName(d.code, d.name)}
                        </span>
                        <span className="text-[9px] font-mono opacity-65">
                          [{d.code}]
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E8E8F2] dark:divide-[#2A2C49]">
                {filteredGroups.map(({ groupName, indicators }) => (
                  <Fragment key={groupName}>
                    {/* Dòng tiêu đề nhóm */}
                    <tr className="bg-[#EFF0F9] dark:bg-[#202242] border-y border-[#D4D5E4] dark:border-[#3E4268] hover:bg-[#EFF0F9] dark:hover:bg-[#202242]">
                      <td
                        colSpan={visibleDepts.length + 1}
                        className="px-3.5 py-2 font-bold text-[#1F2050] dark:text-[#8E87F5] uppercase tracking-wider text-[11px] bg-[#EFF0F9] dark:bg-[#202242] sticky left-0 z-10"
                      >
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#6B63DE] dark:text-[#8E87F5]" />
                          <span>{groupName}</span>
                        </div>
                      </td>
                    </tr>

                    {/* Các dòng chỉ số thuộc nhóm */}
                    {indicators.map((ind) => (
                      <tr
                        key={ind.id}
                        className="hover:bg-[#F0F1F9] dark:hover:bg-[#242744] transition-colors duration-150"
                      >
                        {/* Tên chỉ số (cố định cột trái) */}
                        <td className="px-3.5 py-2 font-semibold text-[#1F2050] dark:text-[#F0F1F9] border-r-2 border-[#D4D5E4] dark:border-[#3E4268] bg-white dark:bg-[#18192E] sticky left-0 z-10 whitespace-nowrap relative select-none text-xs">
                          <div className="flex items-center justify-between gap-2 pr-1">
                            <span>{ind.name}</span>
                            {ind.canEdit && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-[#6B63DE] dark:bg-[#8E87F5] shrink-0"
                                title="Chỉ số bạn được phân quyền nhập"
                              />
                            )}
                          </div>
                          {/* Dải nhận diện kéo chuột trái tại mép cột */}
                          <div
                            {...dragProps}
                            title="Nhấn giữ chuột trái kéo để cuộn bảng"
                            className={cn(
                              'absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize z-20 hover:bg-[#6B63DE]/20 transition-colors',
                              isDragging && 'bg-[#6B63DE]/20'
                            )}
                          />
                        </td>

                        {/* Các ô giá trị theo từng khoa */}
                        {visibleDepts.map((dept) => {
                          const editable = canEditCell(dept, ind)
                          const val = getCellValue(dept.id, ind.id)

                          // Cột TỔNG (đặc biệt)
                          if (dept.isTotal) {
                            return (
                              <td
                                key={dept.id}
                                className="text-right font-mono font-bold tabular-nums text-[#B7791F] dark:text-[#E0A838] bg-[#FFFBF0] dark:bg-[#241F14] border-r border-[#E8E8F2] dark:border-[#2A2C49] px-1.5 py-1 text-xs"
                              >
                                {val !== 0 ? val.toLocaleString('vi-VN') : '-'}
                              </td>
                            )
                          }

                          // Cột khoa có thể nhập
                          if (editable) {
                            const isEdited = dirty[`${dept.id}_${ind.id}`] !== undefined

                            return (
                              <td
                                key={dept.id}
                                className={cn(
                                  'p-0 border-r border-[#E8E8F2] dark:border-[#2A2C49] transition-colors duration-150',
                                  isEdited
                                    ? 'bg-[#EDECFB] dark:bg-[#282B52]'
                                    : 'bg-[#F2F2FD]/30 dark:bg-[#202242]/20'
                                )}
                              >
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={val === 0 && !dirty[`${dept.id}_${ind.id}`] ? '' : val}
                                  onChange={(e) =>
                                    handleCellChange(dept.id, ind.id, e.target.value)
                                  }
                                  placeholder="0"
                                  className="w-full h-7 px-1 text-right font-mono font-semibold tabular-nums text-xs text-[#1F2050] dark:text-[#F0F1F9] bg-transparent focus:bg-[#F2F2FD] dark:focus:bg-[#242744] focus:outline-none focus:ring-2 focus:ring-[#6B63DE]/30 dark:focus:ring-[#8E87F5]/30 placeholder-[#8A8BA0] dark:placeholder-[#6C6F93] transition-shadow duration-150 rounded-[4px]"
                                />
                              </td>
                            )
                          }

                          // Cột khoa chỉ đọc
                          return (
                            <td
                              key={dept.id}
                              className="font-mono tabular-nums text-[#8A8BA0] dark:text-[#6C6F93] border-r border-[#E8E8F2] dark:border-[#2A2C49] px-1.5 py-1 text-right text-xs"
                            >
                              {val !== 0 ? val.toLocaleString('vi-VN') : '-'}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sticky Save Bar khi có ô đã thay đổi */}
      {dirtyCount > 0 && (
        <div
          className={cn(
            'sticky bottom-4 z-40 bg-[#F2F2FD] dark:bg-[#1E2038] border border-[#6B63DE]/30 dark:border-[#6B63DE]/50 shadow-[0_12px_32px_rgba(31,32,80,0.12)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)] rounded-[16px] px-5 py-3 flex items-center justify-between gap-4 transition-transform duration-250 ease-out animate-in slide-in-from-bottom-2',
            isSingleDept ? 'max-w-[1440px] mx-auto' : 'w-full'
          )}
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6B63DE] dark:bg-[#8E87F5] animate-pulse" />
            <span className="text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
              Đang có{' '}
              <strong className="text-[#6B63DE] dark:text-[#8E87F5] font-bold text-sm tabular-nums">
                {dirtyCount}
              </strong>{' '}
              ô dữ liệu chưa lưu
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDirty({})}
              disabled={saving}
            >
              Hủy thay đổi
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              onClick={handleSave}
              className="font-bold"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu ({dirtyCount})</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
