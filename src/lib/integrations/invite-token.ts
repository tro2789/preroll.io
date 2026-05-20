import { createHmac } from 'crypto'

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getKey(): string {
  const key = process.env.INTEGRATION_ENCRYPTION_KEY
  if (!key) throw new Error('INTEGRATION_ENCRYPTION_KEY is required')
  return key
}

interface InvitePayload {
  showId: string
  orgId: string
  provider: string
}

export function createInviteToken(payload: InvitePayload): string {
  const data = { ...payload, exp: Date.now() + INVITE_EXPIRY_MS }
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url')
  const sig = createHmac('sha256', getKey()).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

export function verifyInviteToken(token: string): InvitePayload | null {
  const [encoded, sig] = token.split('.')
  if (!encoded || !sig) return null

  const expectedSig = createHmac('sha256', getKey()).update(encoded).digest('base64url')
  if (sig !== expectedSig) return null

  try {
    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString())
    if (data.exp < Date.now()) return null
    return { showId: data.showId, orgId: data.orgId, provider: data.provider }
  } catch {
    return null
  }
}
