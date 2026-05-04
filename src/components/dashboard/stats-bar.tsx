interface Stats {
  client_count: number
  show_count: number
  episodes_this_month: number
}

export function StatsBar({ stats }: { stats: Stats }) {
  const metrics = [
    { label: 'Clients', value: stats.client_count, accent: 'border-indigo-500/50' },
    { label: 'Shows', value: stats.show_count, accent: 'border-emerald-500/50' },
    { label: 'Episodes This Month', value: stats.episodes_this_month, accent: 'border-amber-500/50' },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={`rounded-lg border-t-2 ${metric.accent} bg-zinc-800/50 p-5`}
        >
          <p className="text-3xl font-bold text-white">{metric.value}</p>
          <p className="mt-1 text-sm text-zinc-400">{metric.label}</p>
        </div>
      ))}
    </div>
  )
}
