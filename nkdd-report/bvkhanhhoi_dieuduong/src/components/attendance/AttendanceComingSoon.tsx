'use client'

import Link from 'next/link'
import {
  CalendarCheck,
  Lock,
  LayoutGrid,
  ClipboardList,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface AttendanceComingSoonProps {
  userRole?: string | null
}

export function AttendanceComingSoon({ userRole }: AttendanceComingSoonProps) {
  const reportRoute = userRole === 'ADMIN' || userRole === 'BGD' ? '/dashboard' : '/report'

  const features = [
    {
      title: 'Bảng chấm công 31 ngày chuyên sâu',
      desc: 'Theo dõi 7 chế độ bệnh viện (Có mặt, Công tác, Đi học, Nghỉ phép, Nghỉ ốm, Thai sản, Vắng)'
    },
    {
      title: 'Xử lý nhân sự thôi việc giữa tháng',
      desc: 'Tự động tính đúng ngày công thực tế trước khi thôi việc, loại trừ ngày nghỉ sau thôi việc'
    },
    {
      title: 'Dropdown menu chuột phải tiện lợi',
      desc: 'Nhấp chuột phải vào bất kỳ ô ngày nào để chọn nhanh trạng thái mà không cần click xoay vòng'
    },
    {
      title: 'Xuất biểu mẫu Excel chuẩn bệnh viện',
      desc: 'Tự động định dạng font Times New Roman, cấu trúc ký hiệu chuẩn và trích xuất số liệu tức thì'
    }
  ]

  return (
    <div className="max-w-[880px] mx-auto py-8 sm:py-12 px-4 space-y-6">
      {/* Thẻ chính thông báo sắp ra mắt */}
      <Card className="p-6 sm:p-10 text-center relative overflow-hidden border border-[#E8E8F2] dark:border-[#2A2C49] shadow-[0_12px_40px_rgba(31,32,80,0.06)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
        {/* Nền hiệu ứng trang trí mờ */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#1E9E52]/10 dark:bg-[#1E9E52]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#6B63DE]/10 dark:bg-[#6B63DE]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Vòng tròn biểu tượng kết hợp Ổ khóa */}
          <div className="relative mb-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#EAFBF1] dark:bg-[#152B1E] border-2 border-[#1E9E52]/30 text-[#1E9E52] dark:text-[#34C759] flex items-center justify-center shadow-md">
              <CalendarCheck className="w-10 h-10 sm:w-12 sm:h-12" strokeWidth={1.75} />
            </div>
            <div
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white dark:bg-[#202242] border-2 border-[#E8E8F2] dark:border-[#2A2C49] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center shadow-sm"
              title="Phân hệ đang được khóa tạm thời"
            >
              <Lock className="w-4 h-4" strokeWidth={2.2} />
            </div>
          </div>

          {/* Badge trạng thái */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDECFB] dark:bg-[#202242] border border-[#6B63DE]/20 text-[#6B63DE] dark:text-[#8E87F5] text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Sắp Ra Mắt • Coming Soon</span>
          </div>

          {/* Tiêu đề chính */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F2050] dark:text-[#F0F1F9] tracking-tight">
            Phân hệ Chấm Công & Phân Ca Trực
          </h1>

          <p className="text-xs sm:text-sm font-semibold text-[#6B63DE] dark:text-[#8E87F5] mt-1">
            Bệnh viện Đa khoa Khánh Hội
          </p>

          {/* Mô tả thông báo */}
          <p className="text-xs sm:text-sm text-[#5A5B7C] dark:text-[#A3A6C4] max-w-xl mx-auto mt-3 leading-relaxed">
            Chức năng đang trong giai đoạn hoàn tất kiểm định cuối cùng và sẽ được mở khóa phục vụ các khoa phòng trong đợt cập nhật chính thức sắp tới. Vui lòng quay lại sau hoặc liên hệ Quản trị viên để biết thêm chi tiết.
          </p>

          {/* 2 Nút điều hướng nhanh */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
            <Link href="/menu">
              <Button
                variant="secondary"
                size="md"
                className="gap-2 font-bold text-xs h-10 px-5 shadow-xs"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Trở về Menu Phân Hệ</span>
              </Button>
            </Link>

            <Link href={reportRoute}>
              <Button
                variant="primary"
                size="md"
                className="gap-2 font-bold text-xs h-10 px-5 shadow-sm"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Vào Báo Cáo Điều Dưỡng</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Danh sách các tính năng nổi bật sẽ ra mắt */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Clock className="w-4 h-4 text-[#1E9E52]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#1F2050] dark:text-[#F0F1F9]">
            Tính năng chính sắp hoạt động
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {features.map((item, idx) => (
            <Card
              key={idx}
              className="p-4 flex items-start gap-3 bg-white/70 dark:bg-[#18192E]/70 border border-[#E8E8F2] dark:border-[#2A2C49]"
            >
              <div className="w-6 h-6 rounded-full bg-[#EAFBF1] dark:bg-[#152B1E] text-[#1E9E52] dark:text-[#34C759] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#1F2050] dark:text-[#F0F1F9]">
                  {item.title}
                </h3>
                <p className="text-[11px] text-[#5A5B7C] dark:text-[#A3A6C4] mt-0.5 leading-snug">
                  {item.desc}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
