'use client'

import { useEffect, useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ShowForm } from '@/components/shows/show-form'
import { DistributionSettings } from '@/components/shows/distribution-settings'
import { EpisodeTemplateEditor } from '@/components/shows/episode-template-editor'
import { ThumbnailUpload } from '@/components/ui/thumbnail-upload'

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'template', label: 'Episode Template' },
  { key: 'distribution', label: 'Distribution' },
] as const

type Tab = (typeof TABS)[number]['key']

export default function EditShowPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = TABS.find((t) => t.key === searchParams.get('tab'))?.key || 'details'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [show, setShow] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchShow() {
      try {
        const res = await fetch(`/api/v1/shows/${showId}`)
        if (!res.ok) throw new Error('Show not found')
        const result = await res.json()
        setShow(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load show')
      } finally {
        setLoading(false)
      }
    }
    fetchShow()
  }, [showId])

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    if (tab === 'details') url.searchParams.delete('tab')
    else url.searchParams.set('tab', tab)
    window.history.replaceState(null, '', url.toString())
  }

  async function handleImageUploaded(fileKey: string) {
    const res = await fetch(`/api/v1/shows/${showId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_art_url: fileKey }),
    })
    if (res.ok) {
      setShow((prev) => prev ? { ...prev, cover_art_url: fileKey } : prev)
    }
  }

  async function handleSubmit(data: {
    name: string
    description: string
    format: string
    schedule: string
  }) {
    const res = await fetch(`/api/v1/shows/${showId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (!res.ok) {
      throw new Error(result.error || 'Failed to update show')
    }
    router.push(`/app/shows/${showId}`)
  }

  if (loading) {
    return <p className="text-text-tertiary">Loading...</p>
  }

  if (error || !show) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">{error || 'Show not found.'}</p>
        <Link
          href="/app/clients"
          className="mt-4 inline-block text-sm text-accent hover:text-accent-hover"
        >
          Back to Clients
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link
        href={`/app/shows/${showId}`}
        className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
      >
        &larr; Back to Show
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-text-primary">Edit Show</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Update {show.name}&apos;s details.
      </p>

      <nav className="mt-6 flex gap-1 border-b border-border-default">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors -mb-px ${
              activeTab === tab.key
                ? 'text-accent-hover border-b-2 border-accent'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {activeTab === 'details' && (
          <div className="flex gap-6 items-start">
            <ThumbnailUpload
              id={showId}
              imageUrl={show.cover_art_url || null}
              showId={showId}
              onUploaded={handleImageUploaded}
              className="w-32 shrink-0"
            />
            <div className="flex-1 max-w-lg">
              <ShowForm
                clientId={show.client_id || ''}
                defaultValues={{
                  name: show.name || '',
                  description: show.description || '',
                  format: show.format || '',
                  schedule: show.schedule || '',
                }}
                onSubmit={handleSubmit}
                submitLabel="Save Changes"
              />
            </div>
          </div>
        )}

        {activeTab === 'template' && (
          <div className="max-w-lg">
            <EpisodeTemplateEditor showId={showId} />
          </div>
        )}

        {activeTab === 'distribution' && (
          <div className="max-w-lg">
            <DistributionSettings showId={showId} />
          </div>
        )}
      </div>
    </div>
  )
}
