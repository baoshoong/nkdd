'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateFull, getTodayHCM, TIMEZONE_HCM } from '@/lib/date-utils'

export interface DatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (date: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  label?: string
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function DatePicker({
  value,
  onChange,
  className,
  placeholder = 'Chọn ngày...',
  disabled = false,
  label
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Phân tích ngày đang chọn để khởi tạo view month/year
  const selectedDateObj = value ? new Date(`${value}T00:00:00.000Z`) : null
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00.000Z`)
    }
    return new Date()
  })

  // Khi value từ ngoài thay đổi, đồng bộ lại viewDate
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setViewDate(new Date(`${value}T00:00:00.000Z`))
    }
  }, [value])

  // Click outside để đóng popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth() // 0 - 11

  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1))
  }

  const handleSelectToday = () => {
    const todayStr = getTodayHCM()
    onChange(todayStr)
    setViewDate(new Date(`${todayStr}T00:00:00.000Z`))
    setIsOpen(false)
  }

  const handleSelectDay = (year: number, month: number, day: number) => {
    const yStr = String(year)
    const mStr = String(month + 1).padStart(2, '0')
    const dStr = String(day).padStart(2, '0')
    const newDateStr = `${yStr}-${mStr}-${dStr}`
    onChange(newDateStr)
    setIsOpen(false)
  }

  // Tạo danh sách các ngày hiển thị trong tháng (kèm ngày bù tháng trước/sau)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  // Thứ của ngày đầu tiên (0: CN, 1: T2, ..., 6: T7). Đổi về 0: T2 ... 6: CN
  let startDayOfWeek = firstDayOfMonth.getDay() - 1
  if (startDayOfWeek === -1) startDayOfWeek = 6

  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const calendarDays: Array<{
    day: number
    month: number
    year: number
    isCurrentMonth: boolean
    dateStr: string
  }> = []

  // Ngày tháng trước
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = viewMonth - 1
    const y = m < 0 ? viewYear - 1 : viewYear
    const adjM = (m + 12) % 12
    const dStr = `${y}-${String(adjM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    calendarDays.push({
      day: d,
      month: adjM,
      year: y,
      isCurrentMonth: false,
      dateStr: dStr
    })
  }

  // Ngày tháng này
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    calendarDays.push({
      day: d,
      month: viewMonth,
      year: viewYear,
      isCurrentMonth: true,
      dateStr: dStr
    })
  }

  // Ngày tháng sau bù cho đủ 35 hoặc 42 ô
  const totalSlots = calendarDays.length <= 35 ? 35 : 42
  const remaining = totalSlots - calendarDays.length
  for (let d = 1; d <= remaining; d++) {
    const m = viewMonth + 1
    const y = m > 11 ? viewYear + 1 : viewYear
    const adjM = m % 12
    const dStr = `${y}-${String(adjM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    calendarDays.push({
      day: d,
      month: adjM,
      year: y,
      isCurrentMonth: false,
      dateStr: dStr
    })
  }

  const todayHCM = getTodayHCM()

  return (
    <div ref={containerRef} className={cn('relative inline-flex items-center', className)}>
      {/* Trigger Button hiển thị dd/MM/yyyy */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'group inline-flex items-center gap-2 h-9 px-3.5 rounded-[12px] text-xs font-semibold select-none transition-all duration-150 cursor-pointer',
          'bg-white dark:bg-[#18192E] border border-[#E8E8F2] dark:border-[#2A2C49] shadow-2xs hover:border-[#6B63DE]/40 dark:hover:border-[#6B63DE]/60 hover:bg-[#F9F9FE] dark:hover:bg-[#202242]',
          'focus:outline-none focus:ring-2 focus:ring-[#6B63DE]/25 dark:focus:ring-[#8E87F5]/25',
          isOpen && 'border-[#6B63DE] dark:border-[#8E87F5] ring-2 ring-[#6B63DE]/25 dark:ring-[#8E87F5]/25 bg-[#F9F9FE] dark:bg-[#202242]',
          disabled && 'opacity-60 cursor-not-allowed hover:border-[#E8E8F2] dark:hover:border-[#2A2C49] hover:bg-white dark:hover:bg-[#18192E]'
        )}
      >
        <div className="w-5 h-5 rounded-[6px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center transition-colors group-hover:bg-[#6B63DE] group-hover:text-white">
          <CalendarIcon className="w-3.5 h-3.5" />
        </div>

        {label && <span className="text-[#5A5B7C] dark:text-[#A3A6C4] font-medium">{label}:</span>}

        <span className="font-bold text-[#1F2050] dark:text-[#F0F1F9] tabular-nums tracking-wide">
          {value ? formatDateFull(value) : placeholder}
        </span>

        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-[#8A8BA0] dark:text-[#6C6F93] transition-transform duration-200 ml-0.5',
            isOpen && 'rotate-180 text-[#6B63DE] dark:text-[#8E87F5]'
          )}
        />
      </button>

      {/* Popover Calendar Shadcn cao cấp */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-[296px] bg-white dark:bg-[#18192E] rounded-[18px] border border-[#E8E8F2] dark:border-[#2A2C49] shadow-[0_12px_36px_rgba(31,32,80,0.14)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] p-4 space-y-3.5 animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Calendar Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#F0F1F9] dark:border-[#2A2C49]">
            <h3 className="text-xs font-bold text-[#1F2050] dark:text-[#F0F1F9] tracking-tight">
              Tháng {viewMonth + 1}, {viewYear}
            </h3>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Tháng trước"
                className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[#5A5B7C] dark:text-[#A3A6C4] hover:bg-[#F0F1F9] dark:hover:bg-[#242744] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                title="Tháng sau"
                className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[#5A5B7C] dark:text-[#A3A6C4] hover:bg-[#F0F1F9] dark:hover:bg-[#242744] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels (T2 - CN) */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w, idx) => (
              <span
                key={w}
                className={cn(
                  'text-[11px] font-bold py-1 select-none',
                  idx >= 5 ? 'text-[#C53030] dark:text-[#FF6B6B]' : 'text-[#8A8BA0] dark:text-[#6C6F93]'
                )}
              >
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, idx) => {
              const isSelected = value === item.dateStr
              const isToday = item.dateStr === todayHCM

              return (
                <button
                  key={`${item.dateStr}-${idx}`}
                  type="button"
                  onClick={() => handleSelectDay(item.year, item.month, item.day)}
                  className={cn(
                    'h-8 rounded-[9px] text-xs font-semibold flex flex-col items-center justify-center relative transition-all duration-150 cursor-pointer select-none',
                    !item.isCurrentMonth && 'text-[#B8B9C8] dark:text-[#4F5377] hover:bg-[#F6F7FB] dark:hover:bg-[#1E2038]',
                    item.isCurrentMonth && !isSelected && 'text-[#1F2050] dark:text-[#F0F1F9] hover:bg-[#F0F1F9] dark:hover:bg-[#242744]',
                    isToday && !isSelected && 'border border-[#6B63DE]/40 font-bold text-[#6B63DE] dark:text-[#8E87F5]',
                    isSelected &&
                      'bg-[#6B63DE] text-white font-bold shadow-xs hover:bg-[#5C54D1]'
                  )}
                >
                  <span className="tabular-nums leading-none">{item.day}</span>
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-[#6B63DE] dark:bg-[#8E87F5] absolute bottom-1" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2.5 border-t border-[#F0F1F9] dark:border-[#2A2C49]">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-[11px] font-bold text-[#6B63DE] dark:text-[#8E87F5] hover:text-[#534CC9] dark:hover:text-[#A8A3FF] hover:underline cursor-pointer select-none"
            >
              Chọn hôm nay
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-[#8A8BA0] dark:text-[#6C6F93] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] cursor-pointer select-none"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
