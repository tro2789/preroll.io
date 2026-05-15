'use client'

import { useRef, useEffect, useState, useCallback, type KeyboardEvent } from 'react'
import { useChatState, useChatActions, type ChatMessage } from './chat-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/format'

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-surface-overlay px-1 py-0.5 rounded text-xs">$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc pl-4 space-y-0.5">$&</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    .replace(/<p><\/p>/g, '')
}

function ToolCallIndicator({ name }: { name: string }) {
  const labels: Record<string, string> = {
    get_dashboard: 'Checking dashboard',
    list_clients: 'Looking up clients',
    get_client: 'Loading client details',
    list_shows: 'Looking up shows',
    get_show: 'Loading show details',
    list_episodes: 'Looking up episodes',
    get_episode: 'Loading episode details',
    list_deliverables: 'Checking deliverables',
    get_activity: 'Checking activity',
    get_ai_status: 'Checking AI credits',
    list_stages: 'Loading pipeline stages',
    list_tags: 'Loading tags',
    list_notes: 'Loading meeting notes',
    create_episode: 'Creating episode',
    update_episode: 'Updating episode',
    create_client: 'Creating client',
    create_show: 'Creating show',
    create_deliverable: 'Sharing file',
    create_note: 'Adding note',
    create_tag: 'Creating tag',
    generate_content: 'Generating content',
    transcribe_episode: 'Starting transcription',
  }

  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary py-1">
      <div className="size-3 border-2 border-accent/50 border-t-accent rounded-full animate-spin" />
      <span>{labels[name] || `Running ${name}`}...</span>
    </div>
  )
}

function ActionCard({ message }: { message: ChatMessage }) {
  const { confirmAction } = useChatActions()
  const action = message.actionRequest
  if (!action) return null

  if (action.status === 'pending') {
    return (
      <div className="mt-2 rounded-lg border border-border-subtle bg-surface-raised p-3">
        <p className="text-sm text-text-primary font-medium mb-2">{action.description}</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => confirmAction(message.id, true)}>
            Confirm
          </Button>
          <Button size="sm" variant="ghost" onClick={() => confirmAction(message.id, false)}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  const statusStyles = {
    confirmed: 'text-accent',
    executed: 'text-success',
    cancelled: 'text-text-tertiary',
    failed: 'text-error',
  }

  const statusLabels = {
    confirmed: 'Executing...',
    executed: 'Done',
    cancelled: 'Cancelled',
    failed: 'Failed',
  }

  return (
    <div className="mt-2 rounded-lg border border-border-subtle bg-surface-raised p-3">
      <p className="text-sm text-text-primary">{action.description}</p>
      <p className={cn('text-xs mt-1', statusStyles[action.status])}>
        {statusLabels[action.status]}
      </p>
    </div>
  )
}

function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-3.5 py-2.5',
          isUser
            ? 'bg-accent/15 text-text-primary'
            : 'bg-surface-raised text-text-primary'
        )}
      >
        {message.toolCalls?.map((tc) => (
          <ToolCallIndicator key={tc.id} name={tc.name} />
        ))}

        {message.content && (
          isUser ? (
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
          ) : (
            <div
              className="text-sm leading-relaxed break-words prose-chat"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
            />
          )
        )}

        {!message.content && message.role === 'assistant' && isStreaming && !message.toolCalls?.length && (
          <div className="flex items-center gap-1.5 py-1">
            <div className="size-1.5 rounded-full bg-text-tertiary animate-pulse" />
            <div className="size-1.5 rounded-full bg-text-tertiary animate-pulse [animation-delay:150ms]" />
            <div className="size-1.5 rounded-full bg-text-tertiary animate-pulse [animation-delay:300ms]" />
          </div>
        )}

        <ActionCard message={message} />
      </div>
    </div>
  )
}

function SessionPicker() {
  const { sessions, isLoadingSessions, sessionId } = useChatState()
  const { newConversation, loadSession, deleteSession } = useChatActions()

  const visibleSessions = sessions.slice(0, 10)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center justify-center size-7 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
        aria-label="Session menu"
      >
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-72">
        <DropdownMenuItem
          onClick={() => newConversation()}
          className="gap-2"
        >
          <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-sm">New conversation</span>
        </DropdownMenuItem>

        {(isLoadingSessions || visibleSessions.length > 0) && (
          <DropdownMenuSeparator />
        )}

        {isLoadingSessions && visibleSessions.length === 0 && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-1.5 py-1.5">
                <div className="h-3.5 w-3/4 rounded bg-surface-overlay animate-pulse" />
                <div className="h-2.5 w-1/3 rounded bg-surface-overlay animate-pulse mt-1" />
              </div>
            ))}
          </>
        )}

        {visibleSessions.map((session) => (
          <DropdownMenuItem
            key={session.id}
            className={cn(
              'group/session flex items-center justify-between gap-2 pr-1',
              session.id === sessionId && 'bg-accent/10'
            )}
            onClick={() => loadSession(session.id)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{session.title || 'Untitled conversation'}</p>
              <p className="text-xs text-text-tertiary">{timeAgo(session.updatedAt)}</p>
            </div>
            <button
              className="shrink-0 size-6 flex items-center justify-center rounded text-text-tertiary opacity-0 group-hover/session:opacity-100 hover:text-error hover:bg-error/10 transition-all"
              onClick={(e) => {
                e.stopPropagation()
                deleteSession(session.id)
              }}
              aria-label="Delete session"
            >
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function CreditBar() {
  const { credits } = useChatState()

  // Hidden when selfHosted or credits not loaded
  if (!credits || credits.selfHosted) return null

  const total = credits.monthly + credits.purchased
  const isLow = total < 5

  return (
    <div className="border-t border-border-subtle px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-xs">
        <svg
          className={cn('size-3', isLow ? 'text-error' : 'text-accent')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <span className={cn(isLow ? 'text-error' : 'text-text-secondary')}>
          {credits.monthly} monthly
          {' · '}
          {credits.purchased} purchased
        </span>
      </div>
      <div className="text-xs text-text-tertiary">
        {isLow ? (
          <a href="/app/settings/ai" className="text-error hover:underline">
            Low — buy credits
          </a>
        ) : (
          '1 credit/turn'
        )}
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="size-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  )
}

function EmptyState() {
  const { sessions } = useChatState()
  const { loadSession } = useChatActions()
  const recentSessions = sessions.slice(0, 3)

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="size-10 rounded-full bg-accent/10 flex items-center justify-center mb-3">
        <svg className="size-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
          <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-1">PreRoll AI</h3>
      <p className="text-xs text-text-secondary leading-relaxed">
        Ask about your episodes, shows, or clients. I can look things up, move episodes, generate content, and more.
      </p>

      {recentSessions.length > 0 && (
        <div className="mt-4 w-full max-w-xs space-y-1">
          <p className="text-xs text-text-tertiary mb-1.5">Recent conversations</p>
          {recentSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => loadSession(session.id)}
              className="w-full text-left px-3 py-2 rounded-lg bg-surface-raised hover:bg-surface-overlay transition-colors"
            >
              <p className="text-sm text-text-primary truncate">
                {session.title || 'Untitled conversation'}
              </p>
              <p className="text-xs text-text-tertiary">{timeAgo(session.updatedAt)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ChatInput() {
  const [value, setValue] = useState('')
  const { isOpen, isStreaming } = useChatState()
  const { sendMessage } = useChatActions()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
    setValue('')
    sendMessage(trimmed)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isStreaming, sendMessage])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [value])

  return (
    <div className="border-t border-border-subtle p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your shows..."
          rows={1}
          className="flex-1 resize-none bg-surface-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 transition-colors"
          disabled={isStreaming}
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isStreaming}
          className="shrink-0 size-8 rounded-lg bg-accent text-white flex items-center justify-center hover:bg-accent-hover disabled:opacity-40 transition-colors"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export function ChatPanel() {
  const { isOpen, messages, isStreaming, context, isLoadingHistory } = useChatState()
  const { close } = useChatActions()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        close()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={close}
        />
      )}

      <div
        className={cn(
          'fixed top-0 right-0 h-full z-50 flex flex-col',
          'bg-surface-base border-l border-border-subtle',
          'w-full md:w-[400px]',
          'transition-transform duration-200 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <button onClick={close} className="md:hidden flex items-center justify-center size-8 -ml-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors" aria-label="Close chat">
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <svg className="size-4 text-accent hidden md:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
              <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
            </svg>
            <h2 className="text-sm font-semibold text-text-primary">AI Assistant</h2>
          </div>
          <div className="flex items-center gap-1">
            <SessionPicker />
            <Button size="icon-sm" variant="ghost" onClick={close} className="hidden md:flex" aria-label="Close chat">
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Context indicator */}
        {context.label && (
          <div className="px-4 py-2 border-b border-border-subtle bg-surface-raised/50">
            <p className="text-xs text-text-secondary truncate">
              Viewing: {context.label}
            </p>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {isLoadingHistory ? (
            <LoadingSpinner />
          ) : messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
              />
            ))
          )}
        </div>

        {/* Credit bar */}
        <CreditBar />

        {/* Input */}
        <ChatInput />
      </div>
    </>
  )
}
