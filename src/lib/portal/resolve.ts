import { headers, cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'

const CLIENT_SELECT = 'id, name, org_id, portal_welcome_dismissed_at, organizations(display_name, logo_url, accent_color, portal_custom_css, plan_id, allow_client_downloads)' as const

export interface PortalClient {
  id: string
  name: string
  org_id: string
  portal_welcome_dismissed_at: string | null
  organizations: {
    display_name: string | null
    logo_url: string | null
    accent_color: string | null
    portal_custom_css: string | null
    plan_id: string
    allow_client_downloads: boolean
  } | null
}

export async function resolvePortalClient(
  supabase: SupabaseClient,
  userId: string
): Promise<{ client: PortalClient | null; isPreview: boolean }> {
  const headersList = await headers()
  const cookieStore = await cookies()
  const url = headersList.get('x-url') || ''
  const previewFromUrl = url ? new URL(url, 'http://localhost').searchParams.get('preview') : null
  const previewClientId = previewFromUrl || cookieStore.get('portal_preview_client_id')?.value || null

  if (previewClientId) {
    const service = createServiceClient()
    const { data } = await service
      .from('clients')
      .select(CLIENT_SELECT)
      .eq('id', previewClientId)
      .single()

    if (data) {
      const { data: membership } = await service
        .from('memberships')
        .select('id')
        .eq('user_id', userId)
        .eq('org_id', data.org_id)
        .single()

      if (membership) {
        return { client: data as unknown as PortalClient, isPreview: true }
      }
    }
  }

  const { data } = await supabase
    .from('clients')
    .select(CLIENT_SELECT)
    .eq('client_user_id', userId)
    .single()

  return { client: data as unknown as PortalClient | null, isPreview: false }
}
