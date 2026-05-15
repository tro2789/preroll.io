'use client'

import { useEffect } from 'react'
import { useChatState, useChatActions } from './chat-context'
import { cn } from '@/lib/utils'

export function ChatToggle() {
  const { isOpen } = useChatState()
  const { toggle } = useChatActions()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  return (
    <button
      onClick={toggle}
      aria-label="Toggle AI assistant"
      aria-expanded={isOpen}
      className={cn(
        'fixed bottom-5 right-5 z-40',
        'size-12 rounded-full',
        'bg-accent text-white shadow-lg',
        'flex items-center justify-center',
        'hover:brightness-110 active:scale-95',
        'transition-all duration-150',
        isOpen && 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto'
      )}
    >
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
        <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
        <path d="M18 15l.5 1.5L20 17l-1.5.5L18 19l-.5-1.5L16 17l1.5-.5L18 15z" />
      </svg>
    </button>
  )
}
