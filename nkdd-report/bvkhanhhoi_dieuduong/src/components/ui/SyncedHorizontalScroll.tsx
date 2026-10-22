'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncedHorizontalScrollProps {
  tableContainerRef: React.RefObject<HTMLDivElement | null>
  className?: string
  label?: string
}

/**
 * Thanh cuộn ngang phụ đặt trên nóc bảng, đồng bộ 2 chiều thời gian thực với thanh cuộn chính của bảng.
 * Giúp người dùng ngay lập tức cuộn xem các cột khoa phòng mà không cần phải cuộn chuột xuống đáy trang.
 */
export function SyncedHorizontalScroll({
  tableContainerRef,
  className,
  label = 'Kéo thanh cuộn để xem các cột khoa phòng'
}: SyncedHorizontalScrollProps) {
  const topScrollRef = useRef<HTMLDivElement>(null)
  const [scrollWidth, setScrollWidth] = useState<number>(0)
  const [hasOverflow, setHasOverflow] = useState<boolean>(false)
  const isSyncingRef = useRef<boolean>(false)

  // Cập nhật kích thước cuộn của bảng qua ResizeObserver
  const updateMetrics = useCallback(() => {
    const tableEl = tableContainerRef.current
    if (!tableEl) return

    const sw = tableEl.scrollWidth
    const cw = tableEl.clientWidth
    setScrollWidth(sw)
    setHasOverflow(sw > cw + 4)
  }, [tableContainerRef])

  useEffect(() => {
    const tableEl = tableContainerRef.current
    if (!tableEl) return

    updateMetrics()

    const ro = new ResizeObserver(() => {
      updateMetrics()
    })
    ro.observe(tableEl)

    const firstChild = tableEl.firstElementChild
    if (firstChild) {
      ro.observe(firstChild)
    }

    return () => {
      ro.disconnect()
    }
  }, [tableContainerRef, updateMetrics])

  // Lắng nghe cuộn từ thanh trên -> cập nhật xuống bảng dưới
  const handleTopScroll = () => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true

    if (topScrollRef.current && tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft
    }

    requestAnimationFrame(() => {
      isSyncingRef.current = false
    })
  }

  // Lắng nghe cuộn từ bảng dưới -> cập nhật lên thanh trên
  useEffect(() => {
    const tableEl = tableContainerRef.current
    if (!tableEl) return

    const handleBottomScroll = () => {
      if (isSyncingRef.current) return
      isSyncingRef.current = true

      if (topScrollRef.current) {
        topScrollRef.current.scrollLeft = tableEl.scrollLeft
      }

      requestAnimationFrame(() => {
        isSyncingRef.current = false
      })
    }

    tableEl.addEventListener('scroll', handleBottomScroll, { passive: true })
    return () => {
      tableEl.removeEventListener('scroll', handleBottomScroll)
    }
  }, [tableContainerRef])

  if (!hasOverflow) return null

  return (
    <div
      className={cn(
        'w-full bg-[#F6F7FB] dark:bg-[#18192E] border border-[#E8E8F2] dark:border-[#2A2C49] rounded-[12px] px-3 py-1.5 flex items-center gap-3 transition-opacity duration-200 select-none shadow-2xs',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B63DE] dark:text-[#8E87F5] shrink-0">
        <ArrowLeftRight className="w-3.5 h-3.5 text-[#6B63DE] dark:text-[#8E87F5] stroke-[2.5]" />
        <span className="hidden sm:inline">{label}</span>
      </div>

      {/* Khung cuộn ngang phụ */}
      <div
        ref={topScrollRef}
        onScroll={handleTopScroll}
        className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin py-0.5"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div style={{ width: `${scrollWidth}px`, height: '6px' }} />
      </div>
    </div>
  )
}
