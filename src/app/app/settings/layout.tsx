import { SettingsNav } from './settings-nav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto scrollbar-hide border-b border-border-default">
        <div className="flex gap-1 min-w-max">
          <SettingsNav />
        </div>
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  )
}
