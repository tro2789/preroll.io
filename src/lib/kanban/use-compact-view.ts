import { useState, useCallback, useEffect } from 'react'

export function useCompactView() {
  const storageKey = 'preroll:compact-view'

  const [compact, setCompact] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem(storageKey) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(compact))
    } catch {
      // localStorage unavailable
    }
  }, [compact])

  const toggle = useCallback(() => setCompact((prev) => !prev), [])

  return { compact, toggle }
}
