'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Client {
  id: string
  name: string
  company: string | null
  email: string | null
  created_at: string
}

type SortKey = 'name' | 'company' | 'email' | 'created_at'
type SortDir = 'asc' | 'desc'

const columns: { key: SortKey; label: string; hideBelow?: string; align?: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'company', label: 'Company', hideBelow: 'sm' },
  { key: 'email', label: 'Email', hideBelow: 'md' },
  { key: 'created_at', label: 'Added', align: 'right' },
]

function compare(a: Client, b: Client, key: SortKey, dir: SortDir): number {
  let av: string | null
  let bv: string | null

  if (key === 'created_at') {
    av = a.created_at
    bv = b.created_at
  } else {
    av = a[key]?.toLowerCase() ?? null
    bv = b[key]?.toLowerCase() ?? null
  }

  if (av === null && bv === null) return 0
  if (av === null) return 1
  if (bv === null) return -1

  const cmp = av < bv ? -1 : av > bv ? 1 : 0
  return dir === 'asc' ? cmp : -cmp
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      className={`inline-block w-3 h-3 ml-1 transition-colors ${active ? 'text-text-primary' : 'text-transparent group-hover/th:text-text-tertiary'}`}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      {dir === 'asc' || !active ? (
        <path d="M6 2.5v7M3 6l3-3.5L9 6" />
      ) : (
        <path d="M6 9.5v-7M3 6l3 3.5L9 6" />
      )}
    </svg>
  )
}

export function ClientsTable({ clients }: { clients: Client[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...clients].sort((a, b) => compare(a, b, sortKey, sortDir))

  if (clients.length === 0) {
    return (
      <div className="mt-12 rounded-lg border border-border-subtle border-dashed py-12 text-center">
        <p className="text-sm text-text-tertiary">No clients yet</p>
        <Link
          href="/app/clients/new"
          className="mt-2 inline-block text-xs text-accent hover:text-accent-hover transition-colors font-medium"
        >
          Add your first client
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-[10px] border border-border-subtle bg-surface-raised overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-subtle text-left">
            {columns.map(col => {
              const hideCls = col.hideBelow === 'sm' ? 'hidden sm:table-cell' : col.hideBelow === 'md' ? 'hidden md:table-cell' : ''
              return (
                <th
                  key={col.key}
                  className={`px-3.5 py-[9px] ${hideCls} ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  <button
                    onClick={() => handleSort(col.key)}
                    className="group/th inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.04em] text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {col.label}
                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {sorted.map(client => (
            <tr key={client.id} className="group hover:bg-[oklch(0.21_0.006_264_/_0.4)]">
              <td className="px-3.5 py-2.5">
                <Link
                  href={`/app/clients/${client.id}`}
                  className="text-[13px] font-medium text-text-primary group-hover:text-accent transition-colors"
                >
                  {client.name}
                </Link>
              </td>
              <td className="px-3.5 py-2.5 hidden sm:table-cell">
                <span className="text-[13px] text-text-secondary">{client.company || '—'}</span>
              </td>
              <td className="px-3.5 py-2.5 hidden md:table-cell">
                {client.email ? (
                  <a href={`mailto:${client.email}`} className="text-[13px] text-text-secondary hover:text-accent transition-colors">{client.email}</a>
                ) : (
                  <span className="text-[13px] text-text-tertiary">—</span>
                )}
              </td>
              <td className="px-3.5 py-2.5 text-right">
                <span className="text-[13px] text-text-secondary tabular-nums">
                  {formatDate(client.created_at)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
