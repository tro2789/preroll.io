'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    chatwootSettings?: Record<string, unknown>
    chatwootSDK?: { run: (config: { websiteToken: string; baseUrl: string }) => void }
    $chatwoot?: {
      toggle: (state?: 'open' | 'close') => void
      setUser: (id: string, attrs: Record<string, unknown>) => void
      setCustomAttributes: (attrs: Record<string, unknown>) => void
      setLabel: (label: string) => void
      reset: () => void
    }
  }
}

const CHATWOOT_BASE_URL = 'https://chatwoot.tohareprod.com'
const CHATWOOT_TOKEN = 'XsJM9YxtnKy1MymaHKoLM7WC'

export function ChatwootWidget() {
  useEffect(() => {
    if (window.chatwootSDK) return

    window.chatwootSettings = {
      position: 'right',
      type: 'standard',
      launcherTitle: 'Chat with us',
    }

    const script = document.createElement('script')
    script.src = `${CHATWOOT_BASE_URL}/packs/js/sdk.js`
    script.async = true
    script.onload = () => {
      window.chatwootSDK?.run({
        websiteToken: CHATWOOT_TOKEN,
        baseUrl: CHATWOOT_BASE_URL,
      })
    }
    document.body.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  return null
}

interface ChatwootIdentity {
  userId: string
  email: string
  name?: string
  planId: string
  orgName?: string
}

export function ChatwootSupport({ identity }: { identity: ChatwootIdentity }) {
  useEffect(() => {
    window.chatwootSettings = {
      position: 'right',
      type: 'expanded_bubble',
      launcherTitle: 'Chat with support',
    }

    const style = document.createElement('style')
    style.textContent = `
      .woot--bubble-holder { display: none !important; }
      .woot-widget-holder { z-index: 35 !important; }
    `
    document.head.appendChild(style)

    const script = document.createElement('script')
    script.src = `${CHATWOOT_BASE_URL}/packs/js/sdk.js`
    script.async = true
    script.onload = () => {
      window.chatwootSDK?.run({
        websiteToken: CHATWOOT_TOKEN,
        baseUrl: CHATWOOT_BASE_URL,
      })

      function identifyAndOpen() {
        if (!window.$chatwoot) {
          setTimeout(identifyAndOpen, 200)
          return
        }
        window.$chatwoot.setUser(identity.userId, {
          email: identity.email,
          name: identity.name || identity.email,
        })
        window.$chatwoot.setCustomAttributes({
          plan: identity.planId,
          org_name: identity.orgName || '',
        })
        if (identity.planId === 'studio') {
          window.$chatwoot.setLabel('priority')
        }
        window.$chatwoot.toggle('open')
      }
      identifyAndOpen()
    }
    document.body.appendChild(script)

    return () => {
      script.remove()
      style.remove()
      document.querySelector('.woot-widget-holder')?.remove()
      document.querySelector('.woot--bubble-holder')?.remove()
    }
  }, [identity.userId, identity.email, identity.name, identity.planId, identity.orgName])

  return null
}
