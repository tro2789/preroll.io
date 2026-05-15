'use client'

import { ChatProvider } from './chat-context'
import { ChatPanel } from './chat-panel'
import { ChatToggle } from './chat-toggle'
import { ChatContextSync } from './chat-context-sync'

export function ChatShell({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <ChatContextSync />
      {children}
      <ChatToggle />
      <ChatPanel />
    </ChatProvider>
  )
}
