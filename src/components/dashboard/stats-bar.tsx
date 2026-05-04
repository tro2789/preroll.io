interface Stats {
  client_count: number
  show_count: number
  episodes_this_month: number
  pending_deliverables: number
}

export function StatsBar({ stats }: { stats: Stats }) {
  const items = [
    { label: 'Clients', value: stats.client_count },
    { label: 'Shows', value: stats.show_count },
    { label: 'Episodes this month', value: stats.episodes_this_month },
    { label: 'Pending review', value: stats.pending_deliverables, accent: stats.pending_deliverables > 0 },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border-subtle bg-surface-raised px-4 py-3"
        >
          <p className={`text-2xl font-bold ${item.accent ? 'text-accent' : 'text-text-primary'}`}>
            {item.value}
          </p>
          <p className="text-xs text-text-tertiary mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  )
}
