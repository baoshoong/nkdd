import { Loader2 } from 'lucide-react'

export default function RootLoading() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#EDEEF5] dark:bg-[#0F1021] px-4">
      <div className="bg-white dark:bg-[#18192E] rounded-[20px] p-8 shadow-[0_12px_40px_rgba(31,32,80,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-[#E8E8F2] dark:border-[#2A2C49] flex flex-col items-center gap-4 max-w-[360px] text-center">
        <div className="w-12 h-12 rounded-full bg-[#EDECFB] dark:bg-[#202242] flex items-center justify-center text-[#6B63DE] dark:text-[#8E87F5]">
          <Loader2 className="w-6 h-6 animate-spin stroke-[2.5]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#1F2050] dark:text-[#F0F1F9]">
            Bệnh viện Đa khoa Khánh Hội
          </h3>
          <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium mt-1">
            Đang tải dữ liệu, vui lòng đợi trong giây lát...
          </p>
        </div>
      </div>
    </div>
  )
}
