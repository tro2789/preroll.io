import { headers } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

const CLIENT_SELECT = 'id, name, org_id, portal_welcome_dismissed_at, organizations(display_name, logo_url, accent_color, plan_id, allow_client_downloads)' as const

export interface PortalClient {
  id: string
  name: string
  org_id: string
  portal_welcome_dismissed_at: string | null
  organizations: {
    display_name: string | null
    logo_url: string | null
    accent_color: string | null
    plan_id: string
    allow_client_downloads: boolean
  } | null
}

export async function resolvePortalClient(
  supabase: SupabaseClient,
  userId: string
): Promise<{ client: PortalClient | null; isPreview: boolean }> {
  const headersList = await headers()
  const url = headersList.get('x-url') || ''
  const previewClientId = url ? new URL(url, 'http://localhost').searchParams.get('preview') : null

  if (previewClientId) {
    const { data } = await supabase
      .from('clients')
      .select(CLIENT_SELECT)
      .eq('id', previewClientId)
      .single()

    if (data) {
      return { client: data as unknown as PortalClient, isPreview: true }
    }
  }

  const { data } = await supabase
    .from('clients')
    .select(CLIENT_SELECT)
    .eq('client_user_id', userId)
    .single()

  return { client: data as unknown as PortalClient | null, isPreview: false }
}
