'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { DatePicker } from '@/components/ui/DatePicker'
import { Button } from '@/components/ui/Button'
import { getTodayHCM } from '@/lib/date-utils'
import { cn } from '@/lib/theme/cn'

interface DashboardDatePickerProps {
  currentDate: string // YYYY-MM-DD
}

export function DashboardDatePicker({ currentDate }: DashboardDatePickerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleDateChange = (newDate: string) => {
    if (newDate) {
      router.push(`/dashboard?date=${newDate}`)
    }
  }

  const handleToday = () => {
    const today = getTodayHCM()
    router.push(`/dashboard?date=${today}`)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    startTransition(() => {
      router.refresh()
      setTimeout(() => setIsRefreshing(false), 600)
    })
  }

  // Multi-Client Sync: Tự động refresh khi tab khác lưu dữ liệu, nhấn Sync trên Navbar & chu kỳ 15s
  useEffect(() => {
    let channel: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('nkdd-multi-client')
      channel.onmessage = (event) => {
        if (
          event.data?.type === 'REPORT_UPDATED' ||
          event.data?.type === 'REQUEST_SYNC'
        ) {
          startTransition(() => {
            router.refresh()
          })
        }
      }
    }

    const handleCustomUpdate = () => {
      startTransition(() => {
        router.refresh()
      })
    }
    window.addEventListener('report-updated', handleCustomUpdate)
    window.addEventListener('request-sync', handleCustomUpdate)
    window.addEventListener('focus', handleCustomUpdate)

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        startTransition(() => {
          router.refresh()
        })
      }
    }, 15000)

    return () => {
      channel?.close()
      window.removeEventListener('report-updated', handleCustomUpdate)
      window.removeEventListener('request-sync', handleCustomUpdate)
      window.removeEventListener('focus', handleCustomUpdate)
      clearInterval(interval)
    }
  }, [router])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DatePicker
        value={currentDate}
        onChange={handleDateChange}
      />

      <Button
        variant="secondary"
        size="sm"
        onClick={handleToday}
        className="h-9 text-xs font-semibold px-3 rounded-[12px]"
      >
        Hôm nay
      </Button>

      <button
        type="button"
        onClick={handleRefresh}
        disabled={isPending || isRefreshing}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[12px] bg-[#F2F2FD] dark:bg-[#202242] hover:bg-[#E8E8FB] dark:hover:bg-[#282B52] text-[#6B63DE] dark:text-[#8E87F5] text-xs font-bold transition shadow-2xs cursor-pointer select-none"
        title="Làm mới số liệu Dashboard ngay lập tức"
      >
        <RefreshCw
          className={cn(
            'w-3.5 h-3.5',
            (isPending || isRefreshing) && 'animate-spin'
          )}
        />
        <span className="hidden sm:inline">
          {isPending || isRefreshing ? 'Đang cập nhật...' : 'Làm mới'}
        </span>
      </button>

      {/* Multi-Client indicator */}
      <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EDF9F0] dark:bg-[#152B1E] border border-[#1E9E52]/20 dark:border-[#1E9E52]/30 text-[#1E9E52] dark:text-[#34C759] text-[11px] font-bold select-none shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-[#1E9E52] dark:bg-[#34C759] animate-pulse" />
        <span>Đa máy</span>
      </div>
    </div>
  )
}
