import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export default function AppLoading() {
  return (
    <div className="space-y-5 max-w-[1600px] mx-auto animate-pulse">
      {/* Header Skeleton Card */}
      <Card className="p-5 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-56 bg-[#EDECFB] dark:bg-[#202242] rounded-[8px]" />
          <div className="h-3.5 w-80 bg-[#F0F1F9] dark:bg-[#2A2C49] rounded-[6px]" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-32 bg-[#F0F1F9] dark:bg-[#2A2C49] rounded-[10px]" />
          <div className="h-9 w-28 bg-[#EDECFB] dark:bg-[#202242] rounded-[10px]" />
        </div>
      </Card>

      {/* Main Content Loading Card */}
      <Card className="p-16 flex flex-col items-center justify-center gap-3.5 border border-[#E8E8F2] dark:border-[#2A2C49] min-h-[420px]">
        <div className="w-12 h-12 rounded-full bg-[#EDECFB] dark:bg-[#202242] flex items-center justify-center text-[#6B63DE] dark:text-[#8E87F5] shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin stroke-[2.5]" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold text-[#1F2050] dark:text-[#F0F1F9]">
            Đang tải dữ liệu...
          </h3>
          <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium mt-1">
            Hệ thống đang đồng bộ chỉ số và cập nhật giao diện
          </p>
        </div>
      </Card>
    </div>
  )
}
