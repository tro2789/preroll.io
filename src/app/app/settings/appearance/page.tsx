'use client'

import { useState, useEffect } from 'react'
import { THEMES, THEME_STORAGE_KEY, DEFAULT_THEME } from '@/lib/themes'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export default function AppearancePage() {
  const [activeTheme, setActiveTheme] = useState(DEFAULT_THEME)

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored) setActiveTheme(stored)
  }, [])

  function applyTheme(themeId: string) {
    setActiveTheme(themeId)

    const html = document.documentElement
    THEMES.forEach((t) => html.classList.remove(`theme-${t.id}`))

    if (themeId !== DEFAULT_THEME) {
      html.classList.add(`theme-${themeId}`)
    }

    localStorage.setItem(THEME_STORAGE_KEY, themeId)
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-text-primary">Appearance</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Choose a color theme for the interface.
      </p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {THEMES.map((theme) => {
          const isActive = activeTheme === theme.id
          return (
            <button
              key={theme.id}
              onClick={() => applyTheme(theme.id)}
              className={cn(
                'relative rounded-xl border-2 p-1 transition-all text-left',
                isActive
                  ? 'border-accent ring-1 ring-accent/30'
                  : 'border-border-default hover:border-border-hover'
              )}
            >
              {isActive && (
                <div className="absolute top-2.5 right-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-accent">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}

              <div
                className="rounded-lg overflow-hidden"
                style={{ background: theme.preview.bg }}
              >
                <div className="flex h-[88px]">
                  <div
                    className="w-7 shrink-0 flex flex-col items-center pt-2.5 gap-1.5"
                    style={{
                      background: theme.preview.deeper,
                      borderRight: `1px solid ${theme.preview.border}`,
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded"
                      style={{ background: theme.preview.accent }}
                    />
                    <div
                      className="w-2.5 h-2.5 rounded"
                      style={{ background: theme.preview.text, opacity: 0.15 }}
                    />
                    <div
                      className="w-2.5 h-2.5 rounded"
                      style={{ background: theme.preview.text, opacity: 0.15 }}
                    />
                  </div>

                  <div className="flex-1 p-2 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-1.5 w-10 rounded-full"
                        style={{
                          background: theme.preview.text,
                          opacity: 0.6,
                        }}
                      />
                      <div className="flex-1" />
                      <div
                        className="h-3.5 w-8 rounded"
                        style={{ background: theme.preview.accent }}
                      />
                    </div>

                    <div className="flex gap-1.5">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="flex-1 rounded p-1.5 space-y-1"
                          style={{ background: theme.preview.surface }}
                        >
                          <div
                            className="h-1 rounded-full"
                            style={{
                              background: theme.preview.accent,
                              opacity: 0.6,
                              width: i === 1 ? '40%' : '30%',
                            }}
                          />
                          <div
                            className="h-0.5 w-full rounded-full"
                            style={{
                              background: theme.preview.text,
                              opacity: 0.3,
                            }}
                          />
                          <div
                            className="h-0.5 w-3/4 rounded-full"
                            style={{
                              background: theme.preview.text,
                              opacity: 0.2,
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    <div
                      className="flex-1 rounded p-1.5 space-y-1"
                      style={{ background: theme.preview.surface }}
                    >
                      <div className="flex gap-1">
                        <div
                          className="h-0.5 w-1/3 rounded-full"
                          style={{
                            background: theme.preview.text,
                            opacity: 0.35,
                          }}
                        />
                        <div
                          className="h-0.5 w-1/4 rounded-full"
                          style={{
                            background: theme.preview.text,
                            opacity: 0.2,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2 px-1.5 pb-1">
                <div className="text-sm font-medium text-text-primary">
                  {theme.name}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {theme.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
