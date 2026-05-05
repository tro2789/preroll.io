import type { IntegrationProviderClient, OAuthConfig, BrowseResult, BrowseItem, ShareLink, ProviderAccount } from '../types'
import { createHmac } from 'crypto'

const FRAMEIO_API = 'https://api.frame.io/v4'
const ADOBE_IMS_AUTH = 'https://ims-na1.adobelogin.com/ims/authorize/v2'
const ADOBE_IMS_TOKEN = 'https://ims-na1.adobelogin.com/ims/token/v3'
const SCOPES = ['offline_access', 'openid', 'email', 'profile', 'additional_info.roles']

function getOAuthConfig(): OAuthConfig {
  return {
    authUrl: ADOBE_IMS_AUTH,
    tokenUrl: ADOBE_IMS_TOKEN,
    clientId: process.env.FRAMEIO_CLIENT_ID || '',
    clientSecret: process.env.FRAMEIO_CLIENT_SECRET || '',
    scopes: SCOPES,
    callbackPath: '/auth/integrations/frame_io/callback',
  }
}

async function frameioFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`${FRAMEIO_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Frame.io API error ${res.status}: ${body}`)
  }
  return res.json()
}

class FrameIoClient implements IntegrationProviderClient {
  readonly providerName = 'frame_io' as const
  readonly displayName = 'Frame.io'

  get oauthConfig(): OAuthConfig {
    return getOAuthConfig()
  }

  getAuthUrl(state: string, redirectUri: string): string {
    const config = this.oauthConfig
    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: config.scopes.join(' '),
      state,
    })
    return `${config.authUrl}?${params.toString()}`
  }

  async exchangeCode(code: string, redirectUri: string) {
    const config = this.oauthConfig
    const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
      }).toString(),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Adobe IMS token exchange failed: ${body}`)
    }

    const tokens = await res.json()
    const meResponse = await frameioFetch('/me', tokens.access_token)
    const me = meResponse.data || meResponse

    const accountsResponse = await frameioFetch('/accounts', tokens.access_token)
    const accounts = accountsResponse.data || accountsResponse
    const primaryAccount = Array.isArray(accounts) ? accounts[0] : null

    const account: ProviderAccount = {
      id: primaryAccount?.id || me.id,
      name: me.name || me.email || 'Frame.io User',
      email: me.email,
      avatarUrl: me.avatar_url,
    }

    return {
      accessToken: tokens.access_token as string,
      refreshToken: tokens.refresh_token as string | undefined,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
      account,
    }
  }

  async refreshAccessToken(refreshToken: string) {
    const config = this.oauthConfig
    const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Adobe IMS token refresh failed: ${body}`)
    }

    const tokens = await res.json()
    return {
      accessToken: tokens.access_token as string,
      refreshToken: tokens.refresh_token as string | undefined,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
    }
  }

  async browse(accessToken: string, accountId: string, path?: string, cursor?: string): Promise<BrowseResult> {
    if (!path) {
      const data = await frameioFetch(`/accounts/${accountId}/workspaces`, accessToken)
      const items: BrowseItem[] = (data.data || data).map((ws: Record<string, unknown>) => ({
        id: ws.id as string,
        name: ws.name as string,
        type: 'workspace' as const,
      }))
      return { items, breadcrumb: [{ id: 'root', name: 'Workspaces' }] }
    }

    const [type, , id] = path.split(':')
    const restOfPath = path.substring(type.length + 1)
    const entityAccountId = restOfPath.substring(0, restOfPath.indexOf(':'))
    const entityId = restOfPath.substring(restOfPath.indexOf(':') + 1)
    const acctId = entityAccountId || accountId

    let url = ''
    let breadcrumbLabel = ''

    if (type === 'workspace') {
      url = `/accounts/${acctId}/workspaces/${entityId}/projects`
      breadcrumbLabel = 'Projects'
    } else if (type === 'project') {
      const projectRes = await frameioFetch(`/accounts/${acctId}/projects/${entityId}`, accessToken)
      const project = projectRes.data || projectRes
      const rootFolderId = project.root_folder_id || project.root_asset_id
      url = `/accounts/${acctId}/folders/${rootFolderId}/children`
      breadcrumbLabel = project.name || 'Project'
    } else if (type === 'folder') {
      url = `/accounts/${acctId}/folders/${entityId}/children`
      const folderRes = await frameioFetch(`/accounts/${acctId}/folders/${entityId}`, accessToken).catch(() => null)
      const folder = folderRes?.data || folderRes
      breadcrumbLabel = (folder?.name as string) || 'Folder'
    } else {
      throw new Error(`Unknown browse path type: ${type}`)
    }

    if (cursor) url += `${url.includes('?') ? '&' : '?'}cursor=${cursor}`

    const data = await frameioFetch(url, accessToken)
    const rawItems = data.data || data
    const items: BrowseItem[] = (Array.isArray(rawItems) ? rawItems : []).map((item: Record<string, unknown>) => {
      const itemType = item.type === 'folder' ? 'folder'
        : item.type === 'version_stack' ? 'file'
        : item.type === 'file' ? 'file'
        : type === 'workspace' ? 'project'
        : 'file'
      return {
        id: item.id as string,
        name: item.name as string,
        type: itemType as BrowseItem['type'],
        thumbnailUrl: (item.thumb_360 || item.thumb || item.thumbnail_url) as string | undefined,
        viewUrl: item.view_url as string | undefined,
        mimeType: item.media_type as string | undefined,
        fileSize: item.file_size as number | undefined,
        durationSeconds: item.duration as number | undefined,
        metadata: {
          label: item.label,
          comment_count: item.comment_count,
          status: item.status,
        },
      }
    })

    const nextCursor = data.links?.next as string | undefined
    const breadcrumb = [{ id: 'root', name: 'Workspaces' }, { id: path, name: breadcrumbLabel }]

    return {
      items,
      breadcrumb,
      pagination: { cursor: nextCursor, hasMore: !!nextCursor },
    }
  }

  async getFileDetails(accessToken: string, accountId: string, fileId: string): Promise<BrowseItem> {
    const res = await frameioFetch(`/accounts/${accountId}/files/${fileId}`, accessToken)
    const data = res.data || res
    return {
      id: data.id,
      name: data.name,
      type: 'file',
      thumbnailUrl: data.thumb_360 || data.thumb || data.thumbnail_url,
      viewUrl: data.view_url,
      mimeType: data.media_type,
      fileSize: data.file_size,
      durationSeconds: data.duration,
      metadata: {
        label: data.label,
        comment_count: data.comment_count,
        status: data.status,
      },
    }
  }

  async createShare(accessToken: string, accountId: string, assetIds: string[], name: string): Promise<ShareLink> {
    const res = await frameioFetch(`/accounts/${accountId}/shares`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        name,
        asset_ids: assetIds,
        allow_approvals: true,
        enable_downloading: true,
      }),
    })
    const data = res.data || res
    return {
      url: data.short_url || data.url,
      name: data.name || name,
      expiresAt: data.expires_at,
    }
  }

  verifyWebhookSignature(payload: string, signature: string, timestamp: string): boolean {
    const secret = process.env.FRAMEIO_WEBHOOK_SECRET
    if (!secret) return false
    const message = `v0:${timestamp}:${payload}`
    const expected = createHmac('sha256', secret).update(message).digest('hex')
    return `v0=${expected}` === signature
  }
}

let instance: FrameIoClient | null = null

export function createFrameIoClient(): IntegrationProviderClient {
  if (!instance) instance = new FrameIoClient()
  return instance
}
