'use client'

import { useEffect, useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ShowForm } from '@/components/shows/show-form'
import { DistributionSettings } from '@/components/shows/distribution-settings'
import { EpisodeTemplateEditor } from '@/components/shows/episode-template-editor'
import { ThumbnailUpload } from '@/components/ui/thumbnail-upload'
import { ShowAiSettings } from '@/components/shows/show-ai-settings'
import { ALL_GENERATION_TYPES } from '@/lib/ai/constants'

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'template', label: 'Episode Template' },
  { key: 'distribution', label: 'Distribution' },
  { key: 'ai', label: 'AI Pipeline' },
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
  const [show, setShow] = useState<Record<string, unknown> | null>(null)
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
    return <p className="text-sm text-text-secondary">Loading...</p>
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
        className="text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        &larr; Back to Show
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-text-primary">Edit Show</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Update {String(show.name)}&apos;s details.
      </p>

      <nav className="mt-6 flex gap-1 border-b border-border-default">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors -mb-px ${
              activeTab === tab.key
                ? 'text-accent-hover border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {activeTab === 'details' && (
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <ThumbnailUpload
              id={showId}
              imageUrl={(show.cover_art_url as string) || null}
              showId={showId}
              onUploaded={handleImageUploaded}
              aspect="square"
              className="w-32 shrink-0"
            />
            <div className="flex-1 w-full max-w-lg">
              <ShowForm
                clientId={(show.client_id as string) || ''}
                defaultValues={{
                  name: (show.name as string) || '',
                  description: (show.description as string) || '',
                  format: (show.format as string) || '',
                  schedule: (show.schedule as string) || '',
                }}
                onSubmit={handleSubmit}
                submitLabel="Save Changes"
              />

              <div className="mt-8 border-t border-border-default pt-6">
                <h3 className="text-sm font-medium text-text-secondary">Client Downloads</h3>
                <p className="mt-1 text-xs text-text-tertiary">Control whether clients can download deliverables for this show.</p>
                <select
                  value={show.allow_client_downloads == null ? '' : String(show.allow_client_downloads) === 'true' ? 'true' : 'false'}
                  onChange={async (e) => {
                    const val = e.target.value === '' ? null : e.target.value === 'true'
                    const prev = show.allow_client_downloads
                    setShow((p) => p ? { ...p, allow_client_downloads: val as unknown as string } : p)
                    const res = await fetch(`/api/v1/shows/${showId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ allow_client_downloads: val }),
                    })
                    if (!res.ok) {
                      setShow((p) => p ? { ...p, allow_client_downloads: prev } : p)
                      setError('Failed to update download setting')
                    }
                  }}
                  className="mt-3 w-full max-w-xs rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">Use workspace default</option>
                  <option value="true">Allow downloads</option>
                  <option value="false">Disallow downloads</option>
                </select>
              </div>
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

        {activeTab === 'ai' && (
          <div className="max-w-lg">
            <ShowAiSettings
              showId={showId}
              autoTranscribe={show.ai_auto_transcribe !== false}
              autoGenerate={(show.ai_auto_generate as string[]) || [...ALL_GENERATION_TYPES]}
              tone={(show.ai_tone as string) || null}
              length={(show.ai_length as string) || null}
            />
          </div>
        )}
      </div>
    </div>
  )
}
