import { isIP } from 'net'
import { lookup } from 'dns/promises'

/** Block private/reserved IPv4 ranges and the cloud metadata endpoint. */
function isBlockedIPv4(ip: string): boolean {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return false
  const a = Number(m[1])
  const b = Number(m[2])
  if ([m[1], m[2], m[3], m[4]].some((p) => Number(p) > 255)) return true
  return (
    a === 0 || // "this" network
    a === 10 || // private
    a === 127 || // loopback
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    (a === 169 && b === 254) || // link-local + cloud metadata (169.254.169.254)
    (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64.0.0/10
    a >= 224 // multicast / reserved
  )
}

/** Expand any textual IPv6 (including ::, IPv4-mapped suffix) into 8 16-bit groups. */
function expandIPv6(input: string): number[] | null {
  let addr = input.trim().toLowerCase()
  if (!addr) return null

  // Convert a trailing dotted-quad (IPv4-mapped / -compatible) into two hextets.
  const v4 = addr.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  if (v4) {
    const parts = v4[1].split('.').map(Number)
    if (parts.some((p) => p > 255)) return null
    const hi = ((parts[0] << 8) | parts[1]).toString(16)
    const lo = ((parts[2] << 8) | parts[3]).toString(16)
    addr = addr.slice(0, v4.index) + hi + ':' + lo
  }

  const halves = addr.split('::')
  if (halves.length > 2) return null

  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 ? (halves[1] ? halves[1].split(':') : []) : []

  let groups: string[]
  if (halves.length === 1) {
    if (head.length !== 8) return null
    groups = head
  } else {
    const missing = 8 - head.length - tail.length
    if (missing < 0) return null
    groups = [...head, ...Array(missing).fill('0'), ...tail]
  }
  if (groups.length !== 8) return null

  const nums = groups.map((h) => (h === '' ? 0 : parseInt(h, 16)))
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) return null
  return nums
}

/** Block loopback, IPv4-mapped-to-private, link-local, ULA and multicast IPv6. */
function isBlockedIPv6(addr: string): boolean {
  const g = expandIPv6(addr)
  if (!g) return true // unparseable → fail closed

  // unspecified (::) and loopback (::1)
  if (g.slice(0, 7).every((n) => n === 0) && (g[7] === 0 || g[7] === 1)) return true

  // IPv4-mapped ::ffff:a.b.c.d
  if (g.slice(0, 5).every((n) => n === 0) && g[5] === 0xffff) {
    const v4 = `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`
    return isBlockedIPv4(v4)
  }

  const first = g[0]
  if ((first & 0xfe00) === 0xfc00) return true // fc00::/7 unique-local
  if ((first & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  if ((first & 0xff00) === 0xff00) return true // ff00::/8 multicast
  return false
}

function stripBrackets(host: string): string {
  return host.replace(/^\[/, '').replace(/\]$/, '')
}

/**
 * Synchronous registration-time guard. Rejects non-HTTPS URLs and any host that
 * is a private/loopback/link-local/ULA/metadata IP literal (IPv4 or IPv6,
 * including IPv4-mapped IPv6) or an obviously-internal hostname.
 */
export function isAllowedWebhookUrl(urlStr: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(urlStr)
  } catch {
    return false
  }

  if (parsed.protocol !== 'https:') return false

  const hostname = parsed.hostname.toLowerCase()
  const host = stripBrackets(hostname)

  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    return false
  }

  const ipVersion = isIP(host)
  if (ipVersion === 4) return !isBlockedIPv4(host)
  if (ipVersion === 6) return !isBlockedIPv6(host)

  // Hostname (resolved at dispatch time via isWebhookUrlSafeResolved).
  return true
}

/**
 * Dispatch-time guard: re-runs the literal checks AND resolves the hostname,
 * rejecting if any resolved address falls in a blocked range. Mitigates
 * DNS-rebinding / TOCTOU between registration and delivery.
 */
export async function isWebhookUrlSafeResolved(urlStr: string): Promise<boolean> {
  if (!isAllowedWebhookUrl(urlStr)) return false
  try {
    const host = stripBrackets(new URL(urlStr).hostname.toLowerCase())
    if (isIP(host)) return true // already validated as a literal above

    const results = await lookup(host, { all: true })
    if (!results.length) return false
    for (const r of results) {
      if (r.family === 4 && isBlockedIPv4(r.address)) return false
      if (r.family === 6 && isBlockedIPv6(r.address)) return false
    }
    return true
  } catch {
    return false
  }
}
