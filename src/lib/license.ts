import { createHmac } from 'crypto'

function getSigningKey(): string {
  const key = process.env.INTEGRATION_ENCRYPTION_KEY
  if (!key) throw new Error('INTEGRATION_ENCRYPTION_KEY is required')
  return key
}

export interface LicenseInfo {
  email: string
  orgName: string
  issuedAt: string
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64url')
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8')
}

function sign(payload: string): string {
  return createHmac('sha256', getSigningKey()).update(payload).digest('base64url')
}

export function generateLicenseKey(info: LicenseInfo): string {
  const payload = base64UrlEncode(JSON.stringify({
    email: info.email,
    orgName: info.orgName,
    issuedAt: info.issuedAt,
  }))
  const signature = sign(payload)
  return `${payload}.${signature}`
}

export function validateLicenseKey(key: string): LicenseInfo | null {
  const parts = key.split('.')
  if (parts.length !== 2) return null

  const [payload, signature] = parts
  const expected = sign(payload)
  if (signature !== expected) return null

  try {
    const decoded = JSON.parse(base64UrlDecode(payload))
    if (!decoded.email || !decoded.orgName || !decoded.issuedAt) return null
    return {
      email: decoded.email,
      orgName: decoded.orgName,
      issuedAt: decoded.issuedAt,
    }
  } catch {
    return null
  }
}

export function getLicenseStatus(): { registered: boolean; info: LicenseInfo | null } {
  const key = process.env.PREROLL_LICENSE_KEY
  if (!key) return { registered: false, info: null }

  try {
    const info = validateLicenseKey(key)
    return { registered: info !== null, info }
  } catch {
    return { registered: false, info: null }
  }
}
