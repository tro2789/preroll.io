'use client'

import { useEffect } from 'react'
import { THEMES, THEME_STORAGE_KEY, DEFAULT_THEME } from '@/lib/themes'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored && stored !== DEFAULT_THEME) {
      document.getElementById('app-theme-root')?.classList.add(`theme-${stored}`)
    }
  }, [])

  return (
    <div id="app-theme-root">
      {children}
    </div>
  )
}
