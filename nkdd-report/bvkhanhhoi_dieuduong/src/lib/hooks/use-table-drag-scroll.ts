'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface DragScrollOptions {
  sensitivity?: number
}

/**
 * Hook cho phép người dùng giữ chuột trái tại mép cột ngoài cùng hoặc thanh tiêu đề
 * để kéo cuộn bảng ngang mượt mà như thao tác trên canvas/Excel.
 */
export function useTableDragScroll(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: DragScrollOptions = {}
) {
  const { sensitivity = 1.3 } = options
  const [isDragging, setIsDragging] = useState(false)
  const dragInfoRef = useRef<{
    startX: number
    startScrollLeft: number
    activeTarget: HTMLElement | null
    pointerId: number
  } | null>(null)

  // Bắt đầu nhấn giữ chuột trái
  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // Chỉ nhận chuột trái (button === 0) hoặc touch/bút
      if (e.button !== 0) return
      const container = containerRef.current
      if (!container) return

      // Bỏ qua nếu nhấn vào ô input, button hoặc link
      const target = e.target as HTMLElement
      if (target.closest('input') || target.closest('button') || target.closest('a')) {
        return
      }

      dragInfoRef.current = {
        startX: e.clientX,
        startScrollLeft: container.scrollLeft,
        activeTarget: e.currentTarget,
        pointerId: e.pointerId
      }

      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // Safe fallback
      }

      setIsDragging(true)
      document.body.style.userSelect = 'none'
      e.preventDefault()
    },
    [containerRef]
  )

  // Di chuyển con trỏ chuột
  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragInfoRef.current || !containerRef.current) return

      const deltaX = (e.clientX - dragInfoRef.current.startX) * sensitivity
      containerRef.current.scrollLeft = dragInfoRef.current.startScrollLeft - deltaX
    },
    [containerRef, sensitivity]
  )

  // Nhả chuột / Kết thúc kéo
  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragInfoRef.current) return

      if (dragInfoRef.current.activeTarget) {
        try {
          dragInfoRef.current.activeTarget.releasePointerCapture(dragInfoRef.current.pointerId)
        } catch {
          // Safe fallback
        }
      }

      dragInfoRef.current = null
      setIsDragging(false)
      document.body.style.userSelect = ''
    },
    []
  )

  // Đảm bảo dọn dẹp khi component unmount hoặc window blur
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragInfoRef.current) {
        dragInfoRef.current = null
        setIsDragging(false)
        document.body.style.userSelect = ''
      }
    }

    window.addEventListener('pointerup', handleGlobalMouseUp)
    window.addEventListener('blur', handleGlobalMouseUp)
    return () => {
      window.removeEventListener('pointerup', handleGlobalMouseUp)
      window.removeEventListener('blur', handleGlobalMouseUp)
      document.body.style.userSelect = ''
    }
  }, [])

  return {
    isDragging,
    dragProps: {
      onPointerDown: startDrag,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag
    }
  }
}
