import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'

async function verifyShowAccess(showId: string, orgId: string) {
  const service = createServiceClient()
  const { data: show } = await service
    .from('shows')
    .select('id, client_id, clients!inner(org_id)')
    .eq('id', showId)
    .single()

  if (!show) return false
  const clients = show.clients as unknown as { org_id: string }
  return clients.org_id === orgId
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? ''
    }
    rows.push(row)
  }

  return rows
}

function normalizeHeader(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const h of headers) {
    const lower = h.toLowerCase().replace(/[^a-z_]/g, '')
    if (lower === 'episodename' || lower === 'episode_name') map[h] = 'episode_name'
    else if (lower === 'date') map[h] = 'date'
    else if (lower === 'starts') map[h] = 'starts'
    else if (lower === 'streams') map[h] = 'streams'
    else if (lower === 'listeners') map[h] = 'listeners'
  }
  return map
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  const { showId } = await params
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const hasAccess = await verifyShowAccess(showId, org!.id)
  if (!hasAccess) return errorResponse('Show not found', 404)

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return errorResponse('Request must be multipart/form-data with a file field', 400)
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return errorResponse('A CSV file is required in the "file" field', 400)
  }

  const text = await file.text()
  if (!text.trim()) {
    return errorResponse('CSV file is empty', 400)
  }

  const rows = parseCSV(text)
  if (!rows.length) {
    return errorResponse('CSV file contains no data rows', 400)
  }

  const headerMap = normalizeHeader(Object.keys(rows[0]))
  const hasEpisodeName = Object.values(headerMap).includes('episode_name')
  const hasDate = Object.values(headerMap).includes('date')

  if (!hasEpisodeName || !hasDate) {
    return errorResponse('CSV must contain "Episode Name" and "Date" columns', 400)
  }

  // Look up all episodes in this show
  const service = createServiceClient()
  const { data: episodes, error: epError } = await service
    .from('episodes')
    .select('id, title')
    .eq('show_id', showId)

  if (epError) return errorResponse(epError.message, 500)

  // Build a map of lowercase episode title -> episode id
  const titleToId = new Map<string, string>()
  for (const ep of episodes ?? []) {
    titleToId.set(ep.title.toLowerCase().trim(), ep.id)
  }

  const upsertRows: {
    episode_id: string
    show_id: string
    org_id: string
    provider: string
    date: string
    downloads: number
    plays: number | null
    listeners: number | null
  }[] = []
  const skipped: string[] = []
  const skippedSet = new Set<string>()

  for (const row of rows) {
    let episodeName = ''
    let date = ''
    let starts = 0
    let streams = 0
    let listeners: number | null = null

    for (const [original, normalized] of Object.entries(headerMap)) {
      const val = row[original] ?? ''
      switch (normalized) {
        case 'episode_name':
          episodeName = val
          break
        case 'date':
          date = val
          break
        case 'starts':
          starts = parseInt(val, 10) || 0
          break
        case 'streams':
          streams = parseInt(val, 10) || 0
          break
        case 'listeners':
          listeners = val ? (parseInt(val, 10) || 0) : null
          break
      }
    }

    if (!episodeName || !date) continue

    const episodeId = titleToId.get(episodeName.toLowerCase().trim())
    if (!episodeId) {
      if (!skippedSet.has(episodeName)) {
        skipped.push(episodeName)
        skippedSet.add(episodeName)
      }
      continue
    }

    // Spotify: downloads = starts, plays = streams
    upsertRows.push({
      episode_id: episodeId,
      show_id: showId,
      org_id: org!.id,
      provider: 'spotify_csv',
      date,
      downloads: starts,
      plays: streams || null,
      listeners,
    })
  }

  if (!upsertRows.length && skipped.length) {
    return errorResponse(`No matching episodes found. Skipped: ${skipped.join(', ')}`, 400)
  }

  if (!upsertRows.length) {
    return errorResponse('No valid rows found in CSV', 400)
  }

  // Upsert episode analytics in batches of 500
  let totalInserted = 0
  for (let i = 0; i < upsertRows.length; i += 500) {
    const batch = upsertRows.slice(i, i + 500)
    const { error: insertError, count } = await service
      .from('episode_analytics')
      .upsert(batch, { onConflict: 'episode_id,provider,date', count: 'exact' })

    if (insertError) return errorResponse(insertError.message, 500)
    totalInserted += count ?? batch.length
  }

  // Upsert the analytics_connections entry for spotify_csv
  await service
    .from('analytics_connections')
    .upsert(
      {
        show_id: showId,
        org_id: org!.id,
        provider: 'spotify_csv',
        last_synced_at: new Date().toISOString(),
        sync_status: 'active',
        sync_error: null,
      },
      { onConflict: 'show_id,provider' }
    )

  return jsonResponse({
    imported: totalInserted,
    skipped: skipped.length,
    skipped_episodes: skipped,
  })
}
