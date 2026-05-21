import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClientOrPortalUser, errorResponse } from '@/lib/api/helpers'
import { getValidToken, getIntegrationAccountId } from '@/lib/integrations/token-refresh'
import { ensureProvidersRegistered } from '@/lib/integrations/init'
import { getDownloadUrl } from '@/lib/r2/client'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  const { deliverableId } = await params
  const { supabase, org, portalUserId, error } = await getAuthenticatedClientOrPortalUser()
  if (error) return error

  const { data: deliverable } = await supabase!
    .from('deliverables')
    .select('id, title, file_url, shows(client_id, clients(org_id, client_user_id))')
    .eq('id', deliverableId)
    .single()

  if (!deliverable) return errorResponse('Deliverable not found', 404)

  const show = (deliverable as unknown as { shows: { clients: { org_id: string; client_user_id: string | null } } }).shows
  const producerOrgId = show?.clients?.org_id
  if (!producerOrgId) return errorResponse('Not found', 404)

  if (portalUserId) {
    if (show?.clients?.client_user_id !== portalUserId) return errorResponse('Forbidden', 403)
  } else if (producerOrgId !== org!.id) {
    return errorResponse('Forbidden', 403)
  }

  const { data: fileRef } = await supabase!
    .from('file_references')
    .select('external_id, provider')
    .eq('deliverable_id', deliverableId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!fileRef) {
    if (deliverable.file_url) {
      return NextResponse.redirect(deliverable.file_url)
    }
    return errorResponse('No file available', 404)
  }

  if (fileRef.provider === 'r2') {
    const url = await getDownloadUrl(fileRef.external_id)
    return NextResponse.redirect(url)
  }

  ensureProvidersRegistered()

  if (fileRef.provider === 'frame_io') {
    try {
      const [token, accountId] = await Promise.all([
        getValidToken(producerOrgId, 'frame_io'),
        getIntegrationAccountId(producerOrgId, 'frame_io'),
      ])

      const res = await fetch(
        `https://api.frame.io/v4/accounts/${accountId}/files/${fileRef.external_id}?include=media_links.original`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (res.ok) {
        const json = await res.json()
        const fileData = json.data || json
        const original = fileData.media_links?.original
        const downloadUrl = original?.download_url || original?.url
        if (downloadUrl) return NextResponse.redirect(downloadUrl)
      }
    } catch {}
  }

  if (fileRef.provider === 'google_drive') {
    try {
      const token = await getValidToken(producerOrgId, 'google_drive')
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileRef.external_id}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok && res.body) {
        return new Response(res.body, {
          headers: {
            'Content-Disposition': `attachment; filename="${deliverable.title.replace(/[^\w\s.-]/g, '_')}"`,
            'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
          },
        })
      }
    } catch {}
  }

  if (fileRef.provider === 'vimeo') {
    try {
      const token = await getValidToken(producerOrgId, 'vimeo')
      const res = await fetch(
        `https://api.vimeo.com/videos/${fileRef.external_id}?fields=files,download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.vimeo.*+json;version=3.4',
          },
        }
      )
      if (res.ok) {
        const video = await res.json()
        const dl = video.download as Array<{ quality: string; link: string }> | undefined
        const file = dl?.find((f) => f.quality === 'source') || dl?.[0]
        if (file?.link) return NextResponse.redirect(file.link)
        const files = video.files as Array<{ quality: string; link: string }> | undefined
        const best = files?.find((f) => f.quality === 'hd') || files?.[0]
        if (best?.link) return NextResponse.redirect(best.link)
      }
    } catch {}
  }

  if (deliverable.file_url) {
    return NextResponse.redirect(deliverable.file_url)
  }

  return errorResponse('Download not available', 404)
}
