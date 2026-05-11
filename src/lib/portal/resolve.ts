import { headers, cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

const CLIENT_SELECT = 'id, name, org_id, portal_welcome_dismissed_at, organizations(display_name, logo_url, accent_color, plan_id, allow_client_downloads)' as const
const PREVIEW_COOKIE = 'portal_preview_client_id'

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
  const cookieStore = await cookies()
  const url = headersList.get('x-url') || ''
  const previewFromUrl = url ? new URL(url, 'http://localhost').searchParams.get('preview') : null
  const previewClientId = previewFromUrl || cookieStore.get(PREVIEW_COOKIE)?.value || null

  if (previewClientId) {
    const { data } = await supabase
      .from('clients')
      .select(CLIENT_SELECT)
      .eq('id', previewClientId)
      .single()

    if (data) {
      if (previewFromUrl) {
        cookieStore.set(PREVIEW_COOKIE, previewClientId, {
          path: '/portal',
          maxAge: 60 * 60,
          httpOnly: true,
          sameSite: 'lax',
        })
      }
      return { client: data as unknown as PortalClient, isPreview: true }
    } else {
      cookieStore.delete(PREVIEW_COOKIE)
    }
  }

  const { data } = await supabase
    .from('clients')
    .select(CLIENT_SELECT)
    .eq('client_user_id', userId)
    .single()

  return { client: data as unknown as PortalClient | null, isPreview: false }
}
