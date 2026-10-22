'use client'

import { useState, useEffect, useTransition, Fragment, useRef } from 'react'
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  Users,
  Activity,
  Bed,
  UserCheck,
  TrendingUp,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  GripVertical
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { SyncedHorizontalScroll } from '@/components/ui/SyncedHorizontalScroll'
import { useTableDragScroll } from '@/lib/hooks/use-table-drag-scroll'
import { Badge } from '@/components/ui/Badge'
import { getTodayHCM } from '@/lib/date-utils'
import { getShortDeptName } from '@/lib/department-utils'
import { cn } from '@/lib/utils'

interface StatValue {
  sum: number
  avg: number
  max: number
  min: number
}

interface Department {
  id: number
  code: string
  name: string
  isTotal: boolean
}

interface Indicator {
  id: number
  code: string
  name: string
  groupName: string
}

interface IndicatorGroup {
  id: number
  name: string
  indicators: Indicator[]
}

interface StatisticsData {
  range: {
    from: string
    to: string
    days: number
    dates: string[]
  }
  kpis: {
    totalKhamBenh: number
    avgKhamBenh: number
    totalBnVao: number
    avgBnVao: number
    totalBnRa: number
    avgBnRa: number
    avgBnHienCo: number
  }
  departments: Department[]
  groups: IndicatorGroup[]
  stats: Record<number, Record<number, StatValue>>
}

export default function StatisticsPage() {
  const today = getTodayHCM()

  // Mặc định: 7 ngày qua
  const defaultFrom = () => {
    const d = new Date(`${today}T00:00:00.000Z`)
    d.setUTCDate(d.getUTCDate() - 6)
    return d.toISOString().slice(0, 10)
  }

  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(today)
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL')
  const [viewMetric, setViewMetric] = useState<'sum' | 'avg'>('sum')

  const [data, setData] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState<boolean>(false)

  // Ref container bảng ma trận thống kê
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Hook kéo cuộn ngang bằng cách giữ chuột trái
  const { isDragging, dragProps } = useTableDragScroll(tableContainerRef)

  // Tải dữ liệu từ API
  const fetchStatistics = async (from: string, to: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/statistics?from=${from}&to=${to}`)
      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.error || 'Không thể tải dữ liệu thống kê')
      }
      const json: StatisticsData = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatistics(fromDate, toDate)
  }, [fromDate, toDate])

  // Chọn khoảng ngày nhanh
  const handleQuickPreset = (preset: 'today' | '7days' | 'month' | '30days') => {
    const now = getTodayHCM()
    if (preset === 'today') {
      setFromDate(now)
      setToDate(now)
    } else if (preset === '7days') {
      const d = new Date(`${now}T00:00:00.000Z`)
      d.setUTCDate(d.getUTCDate() - 6)
      setFromDate(d.toISOString().slice(0, 10))
      setToDate(now)
    } else if (preset === 'month') {
      const startOfMonth = `${now.slice(0, 7)}-01`
      setFromDate(startOfMonth)
      setToDate(now)
    } else if (preset === '30days') {
      const d = new Date(`${now}T00:00:00.000Z`)
      d.setUTCDate(d.getUTCDate() - 29)
      setFromDate(d.toISOString().slice(0, 10))
      setToDate(now)
    }
  }

  // Xuất Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true)
      const res = await fetch(`/api/statistics/export?from=${fromDate}&to=${toDate}`)
      if (!res.ok) throw new Error('Xuất file Excel thất bại')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Thong_ke_NKDD_${fromDate}_den_${toDate}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi xuất file Excel')
    } finally {
      setIsExporting(false)
    }
  }

  // Danh sách khoa hiển thị
  const clinicalDepts = data?.departments.filter((d) => !d.isTotal) || []
  const totalDept = data?.departments.find((d) => d.isTotal)

  const displayedDepts =
    selectedDeptId === 'ALL'
      ? clinicalDepts
      : clinicalDepts.filter((d) => d.id === Number(selectedDeptId))

  // Nhóm hiển thị
  const displayedGroups =
    data?.groups.filter(
      (g) => selectedGroupId === 'ALL' || g.id === Number(selectedGroupId)
    ) || []

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Header Toolbar */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[10px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center">
                <BarChart3 className="w-4.5 h-4.5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[#1F2050] dark:text-[#F0F1F9]">
                Thống Kê Báo Cáo Điều Dưỡng Theo Kỳ
              </h1>
            </div>
            <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium mt-1">
              Phân tích số liệu giao ban từ ngày đến ngày &bull; Tự động tính tổng và trung bình mỗi ngày
            </p>
          </div>

          {/* Nút Xuất Excel */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleExportExcel}
              disabled={isExporting || loading || !data}
              className="h-9 px-3.5 text-xs font-bold gap-2 text-[#6B63DE] dark:text-[#8E87F5] bg-[#F2F2FD] dark:bg-[#202242] hover:bg-[#E8E8FB] dark:hover:bg-[#282B52] border border-[#6B63DE]/20 dark:border-[#6B63DE]/40 rounded-[12px] cursor-pointer"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-[#1E9E52] dark:text-[#34C759]" />
              )}
              <span>{isExporting ? 'Đang tạo Excel...' : 'Xuất File Excel'}</span>
            </Button>
          </div>
        </div>

        {/* Thanh Bộ Lọc & Presets */}
        <div className="mt-5 pt-4 border-t border-[#E8E8F2] dark:border-[#2A2C49] flex flex-wrap items-center justify-between gap-4">
          {/* Chọn ngày từ - đến */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#5A5B7C] dark:text-[#A3A6C4]">Từ ngày:</span>
              <DatePicker
                value={fromDate}
                onChange={setFromDate}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#5A5B7C] dark:text-[#A3A6C4]">Đến ngày:</span>
              <DatePicker
                value={toDate}
                onChange={setToDate}
                className="w-40"
              />
            </div>

            {/* Phím tắt nhanh */}
            <div className="flex items-center gap-1.5 bg-[#F6F6FB] dark:bg-[#1E2038] p-1 rounded-[12px] border border-[#E8E8F2] dark:border-[#2A2C49]">
              <button
                type="button"
                onClick={() => handleQuickPreset('today')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-[8px] hover:bg-white dark:hover:bg-[#242744] text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('7days')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-[8px] hover:bg-white dark:hover:bg-[#242744] text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
              >
                7 ngày qua
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('month')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-[8px] hover:bg-white dark:hover:bg-[#242744] text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
              >
                Tháng này
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('30days')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-[8px] hover:bg-white dark:hover:bg-[#242744] text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
              >
                30 ngày
              </button>
            </div>
          </div>

          {/* Lọc theo Khoa phòng & Nhóm chỉ số */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Dropdown Khoa */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#5A5B7C] dark:text-[#A3A6C4]">Khoa:</span>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="h-9 px-3 rounded-[12px] text-xs font-semibold bg-white dark:bg-[#1E2038] border border-[#E8E8F2] dark:border-[#2A2C49] text-[#1F2050] dark:text-[#F0F1F9] focus:outline-none focus:border-[#6B63DE] dark:focus:border-[#8E87F5] cursor-pointer"
              >
                <option value="ALL">Tất cả khoa ({clinicalDepts.length} khoa)</option>
                {clinicalDepts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Chế độ xem: Tổng cộng / Trung bình ngày */}
            <div className="flex items-center bg-[#F6F6FB] dark:bg-[#1E2038] p-1 rounded-[12px] border border-[#E8E8F2] dark:border-[#2A2C49]">
              <button
                type="button"
                onClick={() => setViewMetric('sum')}
                className={cn(
                  'px-3 py-1 text-xs font-bold rounded-[8px] transition cursor-pointer',
                  viewMetric === 'sum'
                    ? 'bg-white dark:bg-[#242744] text-[#6B63DE] dark:text-[#8E87F5] shadow-xs'
                    : 'text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#1F2050] dark:hover:text-[#F0F1F9]'
                )}
              >
                Tổng cộng (Sum)
              </button>
              <button
                type="button"
                onClick={() => setViewMetric('avg')}
                className={cn(
                  'px-3 py-1 text-xs font-bold rounded-[8px] transition cursor-pointer',
                  viewMetric === 'avg'
                    ? 'bg-white dark:bg-[#242744] text-[#6B63DE] dark:text-[#8E87F5] shadow-xs'
                    : 'text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#1F2050] dark:hover:text-[#F0F1F9]'
                )}
              >
                Trung bình / ngày (Avg)
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* 4 Thẻ KPI Tổng Hợp */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5A5B7C] dark:text-[#A3A6C4]">Tổng Lượt Khám</span>
              <div className="w-8 h-8 rounded-[10px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-[#1F2050] dark:text-[#F0F1F9]">
                {data.kpis.totalKhamBenh.toLocaleString('vi-VN')}
              </div>
              <p className="text-[11px] font-semibold text-[#6B63DE] dark:text-[#8E87F5] mt-1">
                Trung bình: {data.kpis.avgKhamBenh.toLocaleString('vi-VN')} lượt / ngày
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5A5B7C] dark:text-[#A3A6C4]">Tổng BN Vào Viện</span>
              <div className="w-8 h-8 rounded-[10px] bg-[#EDF9F0] dark:bg-[#152B1E] text-[#1E9E52] dark:text-[#34C759] flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-[#1F2050] dark:text-[#F0F1F9]">
                {data.kpis.totalBnVao.toLocaleString('vi-VN')}
              </div>
              <p className="text-[11px] font-semibold text-[#1E9E52] dark:text-[#34C759] mt-1">
                Trung bình: {data.kpis.avgBnVao.toLocaleString('vi-VN')} BN / ngày
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5A5B7C] dark:text-[#A3A6C4]">Tổng BN Ra / Chuyển Viện</span>
              <div className="w-8 h-8 rounded-[10px] bg-[#FFF8E6] dark:bg-[#2D2616] text-[#B7791F] dark:text-[#E0A838] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-[#1F2050] dark:text-[#F0F1F9]">
                {data.kpis.totalBnRa.toLocaleString('vi-VN')}
              </div>
              <p className="text-[11px] font-semibold text-[#B7791F] dark:text-[#E0A838] mt-1">
                Trung bình: {data.kpis.avgBnRa.toLocaleString('vi-VN')} BN / ngày
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5A5B7C] dark:text-[#A3A6C4]">BN Hiện Có Trung Bình</span>
              <div className="w-8 h-8 rounded-[10px] bg-[#EBF5FB] dark:bg-[#15273C] text-[#2980B9] dark:text-[#58B9FA] flex items-center justify-center">
                <Bed className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-[#1F2050] dark:text-[#F0F1F9]">
                {data.kpis.avgBnHienCo.toLocaleString('vi-VN')}
              </div>
              <p className="text-[11px] font-semibold text-[#2980B9] dark:text-[#58B9FA] mt-1">
                Số lượng duy trì bình quân mỗi ngày
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Thông báo tải / Lỗi */}
      {loading && (
        <Card className="p-12 flex items-center justify-center">
          <div className="flex items-center gap-3 text-[#5A5B7C] font-semibold text-sm">
            <Loader2 className="w-5 h-5 text-[#6B63DE] animate-spin" />
            Đang tổng hợp dữ liệu thống kê...
          </div>
        </Card>
      )}

      {error && !loading && (
        <Card className="p-6 bg-[#FDECEC] border border-[#C53030]/20 text-[#C53030] text-center font-semibold text-sm">
          {error}
        </Card>
      )}

      {/* Bảng Ma Trận Thống Kê Tổng Hợp */}
      {!loading && data && (
        <div className="space-y-3">
          {/* Thanh cuộn ngang phụ trên nóc bảng */}
          <SyncedHorizontalScroll
            tableContainerRef={tableContainerRef}
            label="Cuộn ngang để xem tất cả khoa phòng"
          />

          <div className="relative border border-[#E8E8F2] dark:border-[#2A2C49] rounded-[20px] overflow-hidden bg-white dark:bg-[#18192E] shadow-[0_4px_20px_rgba(100,100,180,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <div
              ref={tableContainerRef}
              className="max-h-[calc(100vh-230px)] min-h-[350px] overflow-auto scrollbar-thin"
            >
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-[#F6F6FB] dark:bg-[#1E2038] shadow-xs">
                <tr className="border-b border-[#E8E8F2] dark:border-[#2A2C49]">
                  <th className="w-[280px] min-w-[240px] text-left text-xs font-bold text-[#1F2050] dark:text-[#F0F1F9] pl-4 py-3 sticky left-0 z-30 bg-[#F6F6FB] dark:bg-[#1E2038] relative select-none">
                    <div className="flex items-center justify-between pr-2">
                      <span>Chỉ số báo cáo</span>
                      <span className="text-[10px] font-normal text-[#8A8BA0] dark:text-[#6C6F93] flex items-center gap-0.5" title="Nhấn giữ chuột trái tại mép cột để cuộn ngang">
                        <GripVertical className="w-3.5 h-3.5 text-[#6B63DE] dark:text-[#8E87F5]" />
                      </span>
                    </div>
                    {/* Dải kéo chuột trái ở mép ngoài cùng của cột */}
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
                  <th className="w-[120px] min-w-[100px] text-center text-xs font-bold text-[#B7791F] dark:text-[#E0A838] py-3 bg-[#FFFBF0] dark:bg-[#2D2616]">
                    {viewMetric === 'sum' ? 'Tổng viện (Sum)' : 'TB viện / ngày'}
                  </th>
                  <th className="w-[90px] min-w-[80px] text-center text-xs font-bold text-[#1E9E52] dark:text-[#34C759] py-3">
                    Cao nhất
                  </th>
                  <th className="w-[90px] min-w-[80px] text-center text-xs font-bold text-[#C53030] dark:text-[#FF6B6B] py-3">
                    Thấp nhất
                  </th>
                  {displayedDepts.map((dept) => (
                    <th
                      key={dept.id}
                      {...dragProps}
                      className="w-[76px] min-w-[68px] text-center text-xs font-bold text-[#5A5B7C] dark:text-[#A3A6C4] py-2 px-1 cursor-grab active:cursor-grabbing select-none"
                      title={`${dept.name} (${dept.code})`}
                    >
                      <div className="flex flex-col items-center pointer-events-none">
                        <span className="truncate max-w-[68px] leading-tight font-bold">
                          {getShortDeptName(dept.code, dept.name)}
                        </span>
                        <span className="text-[9px] font-mono opacity-65">
                          [{dept.code}]
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {displayedGroups.map((group) => (
                  <Fragment key={group.id}>
                    {/* Hàng phân nhóm */}
                    <tr className="bg-[#EDECFB]/50 dark:bg-[#202242] border-b border-[#E8E8F2] dark:border-[#2A2C49] hover:bg-[#EDECFB]/70 dark:hover:bg-[#202242]">
                      <td
                        colSpan={4 + displayedDepts.length}
                        className="py-2 px-4 text-xs font-bold text-[#6B63DE] dark:text-[#8E87F5] uppercase tracking-wider"
                      >
                        {group.name}
                      </td>
                    </tr>

                    {/* Danh sách chỉ số trong nhóm */}
                    {group.indicators.map((ind) => {
                      const totalStat = totalDept
                        ? data.stats[totalDept.id]?.[ind.id] || { sum: 0, avg: 0, max: 0, min: 0 }
                        : { sum: 0, avg: 0, max: 0, min: 0 }

                      const totalDisplayVal = viewMetric === 'sum' ? totalStat.sum : totalStat.avg

                      return (
                        <tr
                          key={ind.id}
                          className="hover:bg-[#F9F9FD] dark:hover:bg-[#242744] border-b border-[#E8E8F2]/60 dark:border-[#2A2C49] transition-colors"
                        >
                          {/* Cột Tên Chỉ Số (Sticky Left) */}
                          <td className="sticky left-0 z-10 bg-white dark:bg-[#18192E] group-hover:bg-[#F9F9FD] dark:group-hover:bg-[#242744] pl-4 py-2.5 text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9] border-r border-[#E8E8F2]/50 dark:border-[#2A2C49] relative select-none">
                            <span>{ind.name}</span>
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

                          {/* Cột Tổng viện */}
                          <td className="text-right pr-4 py-2.5 text-xs font-bold text-[#B7791F] dark:text-[#E0A838] bg-[#FFFBF0]/60 dark:bg-[#241F14] border-r border-[#E8E8F2]/50 dark:border-[#2A2C49]">
                            {viewMetric === 'sum'
                              ? totalDisplayVal.toLocaleString('vi-VN')
                              : totalDisplayVal.toFixed(1)}
                          </td>

                          {/* Cột Cao nhất viện */}
                          <td className="text-right pr-3 py-2.5 text-xs font-semibold text-[#1E9E52] dark:text-[#34C759] border-r border-[#E8E8F2]/50 dark:border-[#2A2C49]">
                            {totalStat.max.toLocaleString('vi-VN')}
                          </td>

                          {/* Cột Thấp nhất viện */}
                          <td className="text-right pr-3 py-2.5 text-xs font-semibold text-[#C53030] dark:text-[#FF6B6B] border-r border-[#E8E8F2]/50 dark:border-[#2A2C49]">
                            {totalStat.min.toLocaleString('vi-VN')}
                          </td>

                          {/* Cột từng khoa */}
                          {displayedDepts.map((dept) => {
                            const deptStat = data.stats[dept.id]?.[ind.id] || {
                              sum: 0,
                              avg: 0,
                              max: 0,
                              min: 0
                            }
                            const deptVal = viewMetric === 'sum' ? deptStat.sum : deptStat.avg
                            const isZero = deptVal === 0

                            return (
                              <td
                                key={dept.id}
                                className={cn(
                                  'text-right px-1.5 py-1.5 text-xs font-mono tabular-nums border-r border-[#E8E8F2]/30 dark:border-[#2A2C49]',
                                  isZero ? 'text-[#A0A2C0] dark:text-[#4F5377]' : 'text-[#1F2050] dark:text-[#F0F1F9] font-semibold'
                                )}
                              >
                                {viewMetric === 'sum'
                                  ? (isZero ? '0' : deptVal.toLocaleString('vi-VN'))
                                  : (isZero ? '0' : deptVal.toFixed(1))}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}
