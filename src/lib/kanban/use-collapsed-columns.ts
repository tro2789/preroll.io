import { useState, useCallback, useEffect } from 'react'

export function useCollapsedColumns(boardId: string) {
  const storageKey = `preroll:collapsed:${boardId}`

  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...collapsed]))
    } catch {
      // localStorage unavailable
    }
  }, [collapsed, storageKey])

  const toggle = useCallback((columnId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }, [])

  const expand = useCallback((columnId: string) => {
    setCollapsed((prev) => {
      if (!prev.has(columnId)) return prev
      const next = new Set(prev)
      next.delete(columnId)
      return next
    })
  }, [])

  const isCollapsed = useCallback((columnId: string) => collapsed.has(columnId), [collapsed])

  return { isCollapsed, toggle, expand }
}
