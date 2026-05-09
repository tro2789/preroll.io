import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/org/roles'
import { resolveImageUrl } from '@/lib/r2/client'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const MAX_SIZE = 2 * 1024 * 1024

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: Request) {
  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const roleError = requireRole(org!, 'owner')
  if (roleError) return roleError

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return errorResponse('file is required')

  if (!ALLOWED_TYPES.includes(file.type)) {
    return errorResponse(`Unsupported file type. Allowed: ${ALLOWED_TYPES.join(', ')}`)
  }

  if (file.size > MAX_SIZE) {
    return errorResponse('File too large (max 2MB)')
  }

  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/svg+xml': 'svg',
  }
  const ext = extMap[file.type] || 'png'
  const key = `orgs/${org!.id}/logo.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  }))

  const keyWithCacheBust = `${key}?v=${Date.now()}`

  const service = createServiceClient()
  const { error: updateError } = await service
    .from('organizations')
    .update({ logo_url: keyWithCacheBust })
    .eq('id', org!.id)

  if (updateError) return errorResponse(updateError.message, 500)

  return jsonResponse({ logo_url: resolveImageUrl(keyWithCacheBust) || null })
}
