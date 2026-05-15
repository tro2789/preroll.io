'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useChatActions } from './chat-context'

interface PageContext {
  type?: string
  id?: string
  path: string
  label?: string
}

function parsePathContext(pathname: string): PageContext {
  const ctx: PageContext = { path: pathname }

  // /app/shows/[showId]/episodes/[episodeId]
  const episodeMatch = pathname.match(/\/app\/shows\/([^/]+)\/episodes\/([^/]+)/)
  if (episodeMatch) {
    ctx.type = 'episode'
    ctx.id = episodeMatch[2]
    return ctx
  }

  // /app/shows/[showId]
  const showMatch = pathname.match(/\/app\/shows\/([^/]+)$/)
  if (showMatch) {
    ctx.type = 'show'
    ctx.id = showMatch[1]
    return ctx
  }

  // /app/clients/[clientId]
  const clientMatch = pathname.match(/\/app\/clients\/([^/]+)$/)
  if (clientMatch) {
    ctx.type = 'client'
    ctx.id = clientMatch[1]
    return ctx
  }

  ctx.type = 'general'
  return ctx
}

export function ChatContextSync({ contextLabel }: { contextLabel?: string }) {
  const pathname = usePathname()
  const { setContext } = useChatActions()

  useEffect(() => {
    const parsed = parsePathContext(pathname)
    setContext({
      type: parsed.type,
      id: parsed.id,
      path: parsed.path,
      label: contextLabel,
    })
  }, [pathname, contextLabel, setContext])

  return null
}
