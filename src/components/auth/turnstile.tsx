'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      remove: (id: string) => void
    }
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

/** True when a Turnstile site key is configured for this deployment. */
export const turnstileEnabled = Boolean(SITE_KEY)

let scriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => resolve()
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * Cloudflare Turnstile widget. Renders nothing when no site key is set, so
 * auth forms keep working in environments where captcha isn't configured.
 *
 * Tokens are single-use: after a failed auth call, remount the widget
 * (bump its `key`) to get a fresh token.
 */
export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!SITE_KEY) return
    const container = containerRef.current
    let widgetId: string | null = null
    let cancelled = false

    loadTurnstileScript().then(() => {
      if (cancelled || !container || !window.turnstile) return
      widgetId = window.turnstile.render(container, {
        sitekey: SITE_KEY,
        theme: 'dark',
        callback: (token: string) => onTokenRef.current(token),
        'expired-callback': () => onTokenRef.current(null),
        'error-callback': () => onTokenRef.current(null),
      })
    })

    return () => {
      cancelled = true
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [])

  if (!SITE_KEY) return null
  return <div ref={containerRef} className="flex justify-center" />
}
