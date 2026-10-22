'use client'

import { useState, useEffect, useCallback } from 'react'

export type ThemeMode = 'light' | 'dark'

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const [mounted, setMounted] = useState(false)

  // Khởi tạo trạng thái theme khi mount
  useEffect(() => {
    setMounted(true)
    const isDark = document.documentElement.classList.contains('dark')
    setThemeState(isDark ? 'dark' : 'light')

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: ThemeMode }>
      if (customEvent.detail?.theme) {
        setThemeState(customEvent.detail.theme)
      } else {
        const darkActive = document.documentElement.classList.contains('dark')
        setThemeState(darkActive ? 'dark' : 'light')
      }
    }

    window.addEventListener('theme-changed', handleThemeChange)
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange)
    }
  }, [])

  // Chuyển đổi theme
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nkdd_theme', newTheme)
      } catch (e) {
        console.error('Cannot save theme to localStorage:', e)
      }

      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }

      window.dispatchEvent(
        new CustomEvent('theme-changed', { detail: { theme: newTheme } })
      )
    }
  }, [])

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
  }, [theme, setTheme])

  return {
    theme,
    isDark: mounted ? theme === 'dark' : false,
    toggleTheme,
    setTheme,
    mounted
  }
}
