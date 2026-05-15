'use client'

import { THEME_STORAGE_KEY, DEFAULT_THEME } from '@/lib/themes'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <div id="app-theme-root">
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t&&t!=='${DEFAULT_THEME}')document.getElementById('app-theme-root').classList.add('theme-'+t)}catch(e){}})()`,
        }}
      />
      {children}
    </div>
  )
}
