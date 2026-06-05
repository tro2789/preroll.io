import { NextRequest } from 'next/server'
import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const STATIC_LABELS: Record<string, string> = {
  app: 'Home',
  calendar: 'Calendar',
  reports: 'Reports',
  settings: 'Settings',
  billing: 'Billing',
  integrations: 'Integrations',
  team: 'Team',
  branding: 'Branding',
  edit: 'Edit',
  new: 'New',
}

export async function GET(request: NextRequest) {
  const { supabase, org, error } = await getAuthenticatedClient()
  if (error) return error

  const path = request.nextUrl.searchParams.get('path') || ''
  const segments = path.split('/').filter(Boolean)

  const crumbs: { label: string; href: string }[] = []
  let href = ''
  let showId: string | null = null
  let episodeId: string | null = null

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const prev = i > 0 ? segments[i - 1] : null
    href += `/${seg}`

    if (STATIC_LABELS[seg]) {
      crumbs.push({ label: STATIC_LABELS[seg], href })
      continue
    }

    if (seg === 'shows' || seg === 'clients' || seg === 'episodes' ||
        seg === 'preview' || seg === 'review') {
      continue
    }

    if (!UUID_RE.test(seg) && prev !== 'preview') continue

    if (prev === 'shows') {
      showId = seg
      const { data } = await supabase!
        .from('shows')
        .select('name, clients!inner(org_id)')
        .eq('id', seg)
        .eq('clients.org_id', org!.id)
        .maybeSingle()
      crumbs.push({ label: data?.name || 'Show', href })
    } else if (prev === 'episodes') {
      episodeId = seg
      const { data } = await supabase!
        .from('episodes')
        .select('title, shows!inner(clients!inner(org_id))')
        .eq('id', seg)
        .eq('shows.clients.org_id', org!.id)
        .maybeSingle()
      crumbs.push({ label: data?.title || 'Episode', href })
    } else if (prev === 'clients') {
      const { data } = await supabase!
        .from('clients')
        .select('name')
        .eq('id', seg)
        .eq('org_id', org!.id)
        .maybeSingle()
      crumbs.push({ label: data?.name || 'Client', href })
    } else if (prev === 'review') {
      const { data } = await supabase!
        .from('deliverables')
        .select('title, shows!inner(clients!inner(org_id))')
        .eq('id', seg)
        .eq('shows.clients.org_id', org!.id)
        .maybeSingle()
      crumbs.push({ label: data?.title || 'Review', href })
    } else if (prev === 'preview') {
      const { data } = await supabase!
        .from('file_references')
        .select('name')
        .eq('external_id', seg)
        .eq('org_id', org!.id)
        .maybeSingle()
      crumbs.push({ label: data?.name || seg, href })
    }
  }

  return jsonResponse(crumbs)
}
