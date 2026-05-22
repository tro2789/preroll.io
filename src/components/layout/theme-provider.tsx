'use client'

import { useEffect } from 'react'
import { THEMES, THEME_STORAGE_KEY, DEFAULT_THEME } from '@/lib/themes'

function CleanupHtmlTheme() {
  useEffect(() => {
    return () => {
      THEMES.forEach((t) => document.documentElement.classList.remove(`theme-${t.id}`))
    }
  }, [])
  return null
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  /* The inline script below only references compile-time constants from
     our own theme config — no user input is interpolated. */
  return (
    <div id="app-theme-root">
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t&&t!=='${DEFAULT_THEME}'){document.getElementById('app-theme-root').classList.add('theme-'+t);document.documentElement.classList.add('theme-'+t)}}catch(e){}})()`,
        }}
      />
      <CleanupHtmlTheme />
      {children}
    </div>
  )
}
