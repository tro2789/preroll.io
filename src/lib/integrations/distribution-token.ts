import { createServiceClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from './crypto'

const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
const REFRESH_BUFFER_MS = 30 * 60 * 1000

export async function getDistributionToken(
  connection: {
    id: string
    access_token_enc: string | null
    refresh_token_enc: string | null
    token_expires_at: string | null
    connected_by: string | null
  }
): Promise<string | null> {
  if (!connection.access_token_enc) return null

  const needsRefresh = connection.token_expires_at &&
    new Date(connection.token_expires_at).getTime() - Date.now() < REFRESH_BUFFER_MS

  if (!needsRefresh) {
    return decrypt(connection.access_token_enc)
  }

  if (!connection.refresh_token_enc) return null

  const clientId = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_DRIVE_CLIENT_ID || ''
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_DRIVE_CLIENT_SECRET || ''

  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: decrypt(connection.refresh_token_enc),
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  })

  if (!res.ok) {
    console.error('YouTube distribution token refresh failed:', await res.text())
    return null
  }

  const tokens = await res.json()

  const supabase = createServiceClient()
  const updates: Record<string, unknown> = {
    access_token_enc: encrypt(tokens.access_token),
    token_expires_at: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null,
  }
  if (tokens.refresh_token) {
    updates.refresh_token_enc = encrypt(tokens.refresh_token)
  }

  await supabase
    .from('distribution_connections')
    .update(updates)
    .eq('id', connection.id)

  return tokens.access_token as string
}
