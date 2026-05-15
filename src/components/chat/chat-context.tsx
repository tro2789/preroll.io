'use client'

import { createContext, useContext, useCallback, useRef, useState, type ReactNode } from 'react'

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

interface ChatState {
  isOpen: boolean
  sessionId: string | null
  messages: ChatMessage[]
  isStreaming: boolean
  context: ChatContext
}

interface ChatActions {
  toggle: () => void
  open: () => void
  close: () => void
  sendMessage: (message: string) => Promise<void>
  confirmAction: (messageId: string, confirmed: boolean) => Promise<void>
  setContext: (ctx: ChatContext) => void
  newConversation: () => void
}

const ChatStateContext = createContext<ChatState>({
  isOpen: false,
  sessionId: null,
  messages: [],
  isStreaming: false,
  context: {},
})

const ChatActionsContext = createContext<ChatActions>({
  toggle: () => {},
  open: () => {},
  close: () => {},
  sendMessage: async () => {},
  confirmAction: async () => {},
  setContext: () => {},
  newConversation: () => {},
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
  const abortRef = useRef<AbortController | null>(null)

  const toggle = useCallback(() => setIsOpen((v) => !v), [])
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  const newConversation = useCallback(() => {
    setSessionId(null)
    setMessages([])
  }, [])

  const sendMessage = useCallback(async (message: string) => {
    if (isStreaming) return

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

    try {
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
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
  }, [isStreaming, sessionId, context])

  const confirmAction = useCallback(async (messageId: string, confirmed: boolean) => {
    const msg = messages.find((m) => m.id === messageId)
    if (!msg?.actionRequest || !sessionId) return

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
          session_id: sessionId,
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
  }, [messages, sessionId])

  const state: ChatState = { isOpen, sessionId, messages, isStreaming, context }
  const actions: ChatActions = { toggle, open, close, sendMessage, confirmAction, setContext, newConversation }

  return (
    <ChatStateContext.Provider value={state}>
      <ChatActionsContext.Provider value={actions}>
        {children}
      </ChatActionsContext.Provider>
    </ChatStateContext.Provider>
  )
}
