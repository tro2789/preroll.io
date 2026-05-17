'use client'

import { useState } from 'react'
import { ShowForm } from '@/components/shows/show-form'
import { ThumbnailUpload } from '@/components/ui/thumbnail-upload'
import { toast } from 'sonner'

interface ShowDetailsTabProps {
  showId: string
  defaultValues: {
    name: string
    description: string
    format: string
    schedule: string
  }
  coverArtUrl: string | null
  clientId: string
  allowClientDownloads: boolean | null
}

export function ShowDetailsTab({
  showId,
  defaultValues,
  coverArtUrl,
  clientId,
  allowClientDownloads: initialDownloads,
}: ShowDetailsTabProps) {
  const [imageUrl, setImageUrl] = useState(coverArtUrl)
  const [downloads, setDownloads] = useState(initialDownloads)

  async function handleImageUploaded(fileKey: string) {
    const res = await fetch(`/api/v1/shows/${showId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_art_url: fileKey }),
    })
    if (res.ok) {
      setImageUrl(fileKey)
      toast.success('Cover art updated')
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
    toast.success('Show details saved')
  }

  async function handleDownloadsChange(value: boolean | null) {
    const prev = downloads
    setDownloads(value)
    const res = await fetch(`/api/v1/shows/${showId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allow_client_downloads: value }),
    })
    if (!res.ok) {
      setDownloads(prev)
      toast.error('Failed to update download setting')
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      <ThumbnailUpload
        id={showId}
        imageUrl={imageUrl}
        showId={showId}
        onUploaded={handleImageUploaded}
        aspect="square"
        className="w-32 shrink-0"
      />
      <div className="flex-1 w-full">
        <ShowForm
          clientId={clientId}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
        />

        <div className="mt-8 border-t border-border-default pt-6">
          <h3 className="text-sm font-medium text-text-secondary">Client Downloads</h3>
          <p className="mt-1 text-xs text-text-secondary">Control whether clients can download deliverables for this show.</p>
          <select
            value={downloads == null ? '' : String(downloads)}
            onChange={(e) => {
              const val = e.target.value === '' ? null : e.target.value === 'true'
              handleDownloadsChange(val)
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
  )
}
