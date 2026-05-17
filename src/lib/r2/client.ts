import { S3Client, PutObjectCommand, GetObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

function bucket(): string {
  return process.env.R2_BUCKET_NAME!
}

const MULTIPART_THRESHOLD = 100 * 1024 * 1024 // 100MB
const PART_SIZE = 64 * 1024 * 1024 // 64MB chunks

export async function getUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(r2, command, { expiresIn: 3600 })
}

export async function getDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
  })
  return getSignedUrl(r2, command, { expiresIn: 3600 })
}

export function resolveImageUrl(keyOrUrl: string | null | undefined): string | null {
  if (!keyOrUrl) return null
  if (keyOrUrl.startsWith('http')) return keyOrUrl
  const publicBase = process.env.R2_PUBLIC_URL
  if (publicBase) return `${publicBase}/${keyOrUrl}`
  return null
}

export interface MultipartUpload {
  uploadId: string
  key: string
  parts: { partNumber: number; url: string; size: number }[]
}

export async function createMultipartUpload(key: string, contentType: string, fileSize: number): Promise<MultipartUpload> {
  const { UploadId } = await r2.send(new CreateMultipartUploadCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
  }))

  if (!UploadId) throw new Error('Failed to initiate multipart upload')

  const partCount = Math.ceil(fileSize / PART_SIZE)

  const parts = await Promise.all(
    Array.from({ length: partCount }, (_, idx) => {
      const i = idx + 1
      const partSize = i === partCount ? fileSize - (i - 1) * PART_SIZE : PART_SIZE
      const command = new UploadPartCommand({
        Bucket: bucket(),
        Key: key,
        UploadId,
        PartNumber: i,
      })
      return getSignedUrl(r2, command, { expiresIn: 7200 })
        .then(url => ({ partNumber: i, url, size: partSize }))
    })
  )

  return { uploadId: UploadId, key, parts }
}

export async function completeMultipartUpload(key: string, uploadId: string, parts: { partNumber: number; etag: string }[]): Promise<void> {
  await r2.send(new CompleteMultipartUploadCommand({
    Bucket: bucket(),
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map(p => ({ PartNumber: p.partNumber, ETag: p.etag })),
    },
  }))
}

export async function abortMultipartUpload(key: string, uploadId: string): Promise<void> {
  await r2.send(new AbortMultipartUploadCommand({
    Bucket: bucket(),
    Key: key,
    UploadId: uploadId,
  }))
}

export async function deleteObject(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({
    Bucket: bucket(),
    Key: key,
  }))
}

export function shouldUseMultipart(fileSize: number): boolean {
  return fileSize > MULTIPART_THRESHOLD
}

export async function persistExternalThumbnail(
  externalUrl: string,
  entityType: 'episodes' | 'shows',
  entityId: string,
): Promise<string | null> {
  try {
    const res = await fetch(externalUrl, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : 'jpg'
    const buffer = Buffer.from(await res.arrayBuffer())
    const key = `thumbnails/${entityType}/${entityId}.${ext}`
    await r2.send(new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }))
    return resolveImageUrl(key)
  } catch {
    return null
  }
}
