'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Home, ArrowLeft, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#EDEEF5] dark:bg-[#0F1021] px-4 overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#D1D2F7]/50 dark:bg-[#6B63DE]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#E8E8FB]/80 dark:bg-[#202242]/40 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-[480px] bg-white dark:bg-[#18192E] rounded-[24px] shadow-[0_20px_60px_rgba(31,32,80,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-[#E8E8F2] dark:border-[#2A2C49] p-8 text-center space-y-6">
        {/* Hospital Branding */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-16 h-16 rounded-full overflow-hidden shadow-sm border border-[#E8E8F2] dark:border-[#2A2C49]">
            <Image
              src="/logo.png"
              alt="Logo Bệnh viện Đa khoa Khánh Hội"
              fill
              className="object-cover"
              priority
            />
          </div>
          <span className="text-[11px] font-bold text-[#6B63DE] dark:text-[#8E87F5] uppercase tracking-wider">
            Bệnh viện Đa khoa Khánh Hội
          </span>
        </div>

        {/* 404 Badge & Graphic */}
        <div className="space-y-3">
          <div className="w-16 h-16 mx-auto rounded-[20px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center shadow-inner">
            <FileQuestion className="w-8 h-8" />
          </div>

          <h1 className="text-4xl font-extrabold text-[#1F2050] dark:text-[#F0F1F9] tracking-tight font-mono">
            404
          </h1>

          <h2 className="text-lg font-bold text-[#1F2050] dark:text-[#F0F1F9]">
            Không tìm thấy trang yêu cầu
          </h2>

          <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium leading-relaxed max-w-[360px] mx-auto">
            Đường dẫn bạn vừa truy cập không tồn tại, đã bị xóa hoặc bạn không có quyền truy cập vào khu vực này.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => router.back()}
            className="w-full sm:w-auto h-10 px-4 rounded-[12px] gap-2 font-semibold text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại</span>
          </Button>

          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="primary"
              className="w-full sm:w-auto h-10 px-5 rounded-[12px] gap-2 font-bold text-xs"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Về trang chủ</span>
            </Button>
          </Link>
        </div>

        <div className="pt-4 border-t border-[#F0F1F9] dark:border-[#2A2C49] text-[11px] text-[#8A8BA0] dark:text-[#6C6F93] font-medium">
          Hệ thống Báo cáo Giao ban Điều dưỡng &copy; 2026
        </div>
      </div>
    </div>
  )
}
