import { createHmac } from 'crypto'

const SIGNING_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || 'preroll-license-v1'

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
  return createHmac('sha256', SIGNING_KEY).update(payload).digest('base64url')
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

  const info = validateLicenseKey(key)
  return { registered: info !== null, info }
}
