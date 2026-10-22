'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import ReportTable from '@/components/ReportTable'
import { Card } from '@/components/ui/Card'
import { DatePicker } from '@/components/ui/DatePicker'
import { getTodayHCM } from '@/lib/date-utils'

interface ReportPageClientProps {
  canExport: boolean
}

export function ReportPageClient({ canExport }: ReportPageClientProps) {
  const [date, setDate] = useState<string>(getTodayHCM)

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Thanh công cụ chọn ngày và xuất Excel */}
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2050] dark:text-[#F0F1F9]">
            Báo cáo Giao ban Điều dưỡng
          </h1>
          <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium mt-1">
            Theo dõi và nhập số liệu thống kê người bệnh, kỹ thuật và nhân lực theo ngày
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Shadcn UI Custom DatePicker hiển thị chuẩn dd/MM/yyyy */}
          <DatePicker
            value={date}
            onChange={(newDate) => setDate(newDate)}
            label="Ngày báo cáo"
          />

          {canExport && (
            <a
              href={`/api/reports/export?date=${date}`}
              download
              className="inline-flex items-center gap-2 h-9 px-4 rounded-[12px] bg-[#34C759] text-white text-xs font-bold hover:bg-[#2EB34F] active:bg-[#289E45] shadow-xs transition select-none cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Xuất Excel</span>
            </a>
          )}
        </div>
      </Card>

      {/* Bảng ma trận dữ liệu */}
      <ReportTable date={date} />
    </div>
  )
}
