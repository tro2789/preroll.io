interface Stats {
  client_count: number
  show_count: number
  episodes_this_month: number
}

export function StatsBar({ stats }: { stats: Stats }) {
  return (
    <p className="text-sm text-text-secondary">
      <span className="font-medium text-text-primary">{stats.client_count}</span>
      {' '}
      {stats.client_count === 1 ? 'client' : 'clients'}
      <span className="mx-1.5 text-text-tertiary">&middot;</span>
      <span className="font-medium text-text-primary">{stats.show_count}</span>
      {' '}
      {stats.show_count === 1 ? 'show' : 'shows'}
      <span className="mx-1.5 text-text-tertiary">&middot;</span>
      <span className="font-medium text-text-primary">{stats.episodes_this_month}</span>
      {' '}
      {stats.episodes_this_month === 1 ? 'episode' : 'episodes'} this month
    </p>
  )
}
