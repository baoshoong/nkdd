import React from 'react'
import { Users, BedDouble, FileCheck } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'

export interface RightPanelProps {
  user: {
    name?: string | null
    role?: string | null
    departmentCode?: string | null
  }
  stats: {
    totalPatients: number
    emptyBeds: number
    totalBeds?: number
    patientDelta?: {
      value: string
      isPositive: boolean
    }
    submittedDepts: number
    totalDepts: number
  }
}

export function RightPanel({ user, stats }: RightPanelProps) {
  const totalDepts = stats.totalDepts || 11
  const submittedDepts = stats.submittedDepts || 0
  const unsubmittedDepts = Math.max(0, totalDepts - submittedDepts)
  const completionRate = totalDepts > 0 ? Math.round((submittedDepts / totalDepts) * 100) : 0

  const totalBeds = stats.totalBeds || 0
  const emptyRate = totalBeds > 0 ? Math.round((stats.emptyBeds / totalBeds) * 100) : 0

  return (
    <aside className="w-[300px] shrink-0 space-y-4">
      {/* Profile Card */}
      <Card className="text-center p-5">
        <div className="w-16 h-16 rounded-full bg-[#6B63DE] text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-sm">
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <h3 className="font-bold text-base text-[#1F2050] dark:text-[#F0F1F9] mt-3">{user.name}</h3>
        <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium mt-0.5">
          {user.role} {user.departmentCode ? `· Khoa ${user.departmentCode}` : ''}
        </p>
        <div className="mt-3 flex justify-center">
          <Badge variant="brand" dot>
            Trực giao ban hôm nay
          </Badge>
        </div>
      </Card>

      {/* Quick Stats Cards */}
      <div className="space-y-3">
        <div className="p-3.5 rounded-[16px] bg-white dark:bg-[#18192E] border border-[#E8E8F2] dark:border-[#2A2C49] shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#5A5B7C] dark:text-[#A3A6C4]">Tổng BN hiện có</p>
              <p className="text-lg font-bold text-[#1F2050] dark:text-[#F0F1F9] tabular-nums">
                {stats.totalPatients.toLocaleString('vi-VN')}
              </p>
            </div>
          </div>
          {stats.patientDelta ? (
            <Badge
              variant={stats.patientDelta.isPositive ? 'success' : 'danger'}
              className="h-5 px-2 text-[10px] tabular-nums font-semibold"
            >
              {stats.patientDelta.value}
            </Badge>
          ) : (
            <Badge variant="neutral" className="h-5 px-2 text-[10px]">
              0%
            </Badge>
          )}
        </div>

        <div className="p-3.5 rounded-[16px] bg-white dark:bg-[#18192E] border border-[#E8E8F2] dark:border-[#2A2C49] shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[#E1F0FB] dark:bg-[#15273C] text-[#3EA9F5] dark:text-[#58B9FA] flex items-center justify-center">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#5A5B7C] dark:text-[#A3A6C4]">Giường DV trống</p>
              <p className="text-lg font-bold text-[#1F2050] dark:text-[#F0F1F9] tabular-nums">
                {stats.emptyBeds.toLocaleString('vi-VN')}
              </p>
            </div>
          </div>
          <Badge
            variant={emptyRate > 0 ? 'warning' : 'neutral'}
            className="h-5 px-2 text-[10px] tabular-nums font-semibold"
          >
            {totalBeds > 0 ? `Còn ${emptyRate}%` : `${stats.emptyBeds} giường`}
          </Badge>
        </div>
      </div>

      {/* Submission Progress Widget */}
      <Card className="p-4.5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#1F2050] dark:text-[#F0F1F9] flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-[#6B63DE] dark:text-[#8E87F5]" />
            Tiến độ nộp báo cáo
          </span>
          <span className="text-xs font-bold text-[#6B63DE] dark:text-[#8E87F5] tabular-nums">
            {submittedDepts}/{totalDepts}
          </span>
        </div>

        <ProgressBar value={submittedDepts} max={totalDepts} />

        <div className="flex items-center justify-between text-[11px] text-[#5A5B7C] dark:text-[#A3A6C4]">
          <span>Tỉ lệ hoàn tất:</span>
          <span className="font-bold text-[#1F2050] dark:text-[#F0F1F9]">{completionRate}%</span>
        </div>

        <div className="pt-2 border-t border-[#E8E8F2] dark:border-[#2A2C49] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#1E9E52] dark:text-[#34C759] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#1E9E52] dark:bg-[#34C759]" />
              Khoa đã gửi
            </span>
            <span className="font-semibold text-[#1F2050] dark:text-[#F0F1F9] tabular-nums">
              {submittedDepts} khoa
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#B7791F] dark:text-[#E0A838] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#B7791F] dark:bg-[#E0A838]" />
              Khoa chưa gửi
            </span>
            <span className="font-semibold text-[#1F2050] dark:text-[#F0F1F9] tabular-nums">
              {unsubmittedDepts} khoa
            </span>
          </div>
        </div>
      </Card>
    </aside>
  )
}
