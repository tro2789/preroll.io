'use client'

import { createContext, useContext, useCallback, useRef, useState, useEffect, type ReactNode } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: Array<{ id: string; name: string }>
  actionRequest?: {
    toolUseId: string
    actionType: string
    description: string
    actionData: Record<string, unknown>
    status: 'pending' | 'confirmed' | 'cancelled' | 'executed' | 'failed'
    result?: unknown
  }
  createdAt: Date
}

export interface ChatContext {
  type?: string
  id?: string
  path?: string
  label?: string
}

export interface ChatSession {
  id: string
  title: string | null
  contextType: string | null
  createdAt: string
  updatedAt: string
}

export interface Credits {
  monthly: number
  monthlyAllowance: number
  purchased: number
  selfHosted: boolean
}

interface ChatState {
  isOpen: boolean
  sessionId: string | null
  messages: ChatMessage[]
  isStreaming: boolean
  context: ChatContext
  sessions: ChatSession[]
  isLoadingSessions: boolean
  isLoadingHistory: boolean
  credits: Credits | null
}

interface ChatActions {
  toggle: () => void
  open: () => void
  close: () => void
  sendMessage: (message: string) => Promise<void>
  confirmAction: (messageId: string, confirmed: boolean) => Promise<void>
  setContext: (ctx: ChatContext) => void
  newConversation: () => void
  loadSessions: () => Promise<void>
  loadSession: (id: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
}

const ChatStateContext = createContext<ChatState>({
  isOpen: false,
  sessionId: null,
  messages: [],
  isStreaming: false,
  context: {},
  sessions: [],
  isLoadingSessions: false,
  isLoadingHistory: false,
  credits: null,
})

const ChatActionsContext = createContext<ChatActions>({
  toggle: () => {},
  open: () => {},
  close: () => {},
  sendMessage: async () => {},
  confirmAction: async () => {},
  setContext: () => {},
  newConversation: () => {},
  loadSessions: async () => {},
  loadSession: async () => {},
  deleteSession: async () => {},
})

export function useChatState() {
  return useContext(ChatStateContext)
}

export function useChatActions() {
  return useContext(ChatActionsContext)
}

let messageCounter = 0
function tempId() {
  return `tmp_${++messageCounter}_${Date.now()}`
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [context, setContext] = useState<ChatContext>({})
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [credits, setCredits] = useState<Credits | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  // Keep ref in sync for use in callbacks that capture stale closures
  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true)
    try {
      const res = await fetch('/api/v1/ai/sessions')
      if (res.ok) {
        const json = await res.json()
        const rows = json.data?.sessions || []
        setSessions(
          rows.map((r: { id: string; title: string | null; context_type: string | null; created_at: string; updated_at: string }) => ({
            id: r.id,
            title: r.title,
            contextType: r.context_type,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }))
        )
      }
    } catch {
      // silently fail — sessions are non-critical
    } finally {
      setIsLoadingSessions(false)
    }
  }, [])

  const loadCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/ai/addon')
      if (res.ok) {
        const json = await res.json()
        const addon = json.data?.addon
        const selfHosted = json.data?.selfHosted ?? false
        if (addon) {
          setCredits({
            monthly: addon.monthly_remaining ?? 0,
            monthlyAllowance: addon.monthly_allowance ?? 0,
            purchased: addon.credits_balance ?? 0,
            selfHosted,
          })
        }
      }
    } catch {
      // silently fail
    }
  }, [])

  const hasLoadedRef = useRef(false)
  useEffect(() => {
    if (isOpen && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadSessions()
      loadCredits()
    }
  }, [isOpen, loadSessions, loadCredits])

  const loadSession = useCallback(async (id: string) => {
    setIsLoadingHistory(true)
    try {
      const res = await fetch(`/api/v1/ai/sessions/${id}`)
      if (!res.ok) {
        setIsLoadingHistory(false)
        return
      }
      const json = await res.json()
      const rows = json.data?.messages || []
      const loaded: ChatMessage[] = rows.map(
        (r: { id: string; role: string; content: string; tool_calls: unknown; tool_results: unknown; created_at: string }) => ({
          id: r.id,
          role: r.role as 'user' | 'assistant',
          content: r.content || '',
          toolCalls: undefined, // historical tool calls are not re-rendered as spinners
          createdAt: new Date(r.created_at),
        })
      )
      setSessionId(id)
      setMessages(loaded)
    } catch {
      // silently fail
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  const deleteSession = useCallback(async (id: string) => {
    // Optimistic remove
    setSessions((prev) => prev.filter((s) => s.id !== id))

    // If deleting the active session, reset to new conversation
    if (sessionIdRef.current === id) {
      setSessionId(null)
      setMessages([])
    }

    try {
      await fetch(`/api/v1/ai/sessions/${id}`, { method: 'DELETE' })
    } catch {
      // If delete fails, reload sessions to restore truth
      loadSessions()
    }
  }, [loadSessions])

  const toggle = useCallback(() => setIsOpen((v) => !v), [])
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  const newConversation = useCallback(() => {
    setSessionId(null)
    setMessages([])
  }, [])

  const sendMessage = useCallback(async (message: string) => {
    if (isStreaming) return

    // Optimistic credit decrement
    setCredits((prev) => {
      if (!prev || prev.selfHosted) return prev
      if (prev.monthly > 0) {
        return { ...prev, monthly: prev.monthly - 1 }
      }
      if (prev.purchased > 0) {
        return { ...prev, purchased: prev.purchased - 1 }
      }
      return prev
    })

    const userMsg: ChatMessage = {
      id: tempId(),
      role: 'user',
      content: message,
      createdAt: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])

    const assistantMsg: ChatMessage = {
      id: tempId(),
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    }
    setMessages((prev) => [...prev, assistantMsg])
    setIsStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    const wasNewSession = !sessionIdRef.current

    try {
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          message,
          context,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: `Error: ${err.error || 'Something went wrong'}` }
              : m
          )
        )
        setIsStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setIsStreaming(false)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let eventType = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7)
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))

            switch (eventType) {
              case 'session':
                setSessionId(data.session_id)
                break
              case 'delta':
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: m.content + data.content }
                      : m
                  )
                )
                break
              case 'tool_call':
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? {
                          ...m,
                          toolCalls: [...(m.toolCalls || []), { id: data.id, name: data.name }],
                        }
                      : m
                  )
                )
                break
              case 'action_request':
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? {
                          ...m,
                          actionRequest: {
                            toolUseId: data.tool_use_id,
                            actionType: data.action_type,
                            description: data.description,
                            actionData: data.action_data,
                            status: 'pending',
                          },
                        }
                      : m
                  )
                )
                break
              case 'error':
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: m.content + `\n\nError: ${data.message}` }
                      : m
                  )
                )
                break
            }
          }
        }
      }

      // After stream completes, refresh sessions if this was a new session (to get the title)
      if (wasNewSession) {
        loadSessions()
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: m.content || `Error: ${(err as Error).message}` }
              : m
          )
        )
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [isStreaming, context, loadSessions])

  const messagesRef = useRef<ChatMessage[]>([])
  useEffect(() => { messagesRef.current = messages }, [messages])

  const confirmAction = useCallback(async (messageId: string, confirmed: boolean) => {
    const msg = messagesRef.current.find((m) => m.id === messageId)
    if (!msg?.actionRequest || !sessionIdRef.current) return

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.actionRequest
          ? { ...m, actionRequest: { ...m.actionRequest, status: confirmed ? 'confirmed' : 'cancelled' } }
          : m
      )
    )

    try {
      const res = await fetch('/api/v1/ai/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          action_type: msg.actionRequest.actionType,
          action_data: msg.actionRequest.actionData,
          tool_use_id: msg.actionRequest.toolUseId,
          confirmed,
        }),
      })

      const data = await res.json()

      if (confirmed && res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.actionRequest
              ? { ...m, actionRequest: { ...m.actionRequest, status: 'executed', result: data.data?.result } }
              : m
          )
        )
      } else if (!res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.actionRequest
              ? { ...m, actionRequest: { ...m.actionRequest, status: 'failed' } }
              : m
          )
        )
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.actionRequest
            ? { ...m, actionRequest: { ...m.actionRequest, status: 'failed' } }
            : m
        )
      )
    }
  }, [])

  const state: ChatState = {
    isOpen, sessionId, messages, isStreaming, context,
    sessions, isLoadingSessions, isLoadingHistory, credits,
  }
  const actions: ChatActions = {
    toggle, open, close, sendMessage, confirmAction, setContext,
    newConversation, loadSessions, loadSession, deleteSession,
  }

  return (
    <ChatStateContext.Provider value={state}>
      <ChatActionsContext.Provider value={actions}>
        {children}
      </ChatActionsContext.Provider>
    </ChatStateContext.Provider>
  )
}
