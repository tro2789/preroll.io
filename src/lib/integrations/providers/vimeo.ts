import type { IntegrationProviderClient, OAuthConfig, BrowseResult, BrowseItem, ShareLink, ProviderAccount, ProviderCapabilities } from '../types'

const VIMEO_API = 'https://api.vimeo.com'
const VIMEO_AUTH = 'https://api.vimeo.com/oauth/authorize'
const VIMEO_TOKEN = 'https://api.vimeo.com/oauth/access_token'
const SCOPES = ['private', 'video_files', 'upload', 'create', 'edit']

function getOAuthConfig(): OAuthConfig {
  return {
    authUrl: VIMEO_AUTH,
    tokenUrl: VIMEO_TOKEN,
    clientId: process.env.VIMEO_CLIENT_ID || '',
    clientSecret: process.env.VIMEO_CLIENT_SECRET || '',
    scopes: SCOPES,
    callbackPath: '/auth/integrations/vimeo/callback',
  }
}

async function vimeoFetch(path: string, token: string, options?: RequestInit) {
  const url = path.startsWith('http') ? path : `${VIMEO_API}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.vimeo.*+json;version=3.4',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Vimeo API error ${res.status}: ${body}`)
  }
  return res.json()
}

function extractVimeoId(uri: string): string {
  return uri.split('/').pop() || uri
}

function mapVimeoVideo(item: Record<string, unknown>): BrowseItem {
  const pictures = item.pictures as Record<string, unknown> | undefined
  const sizes = pictures?.sizes as Array<Record<string, unknown>> | undefined
  const thumb = sizes?.find((s) => (s.width as number) >= 295) || sizes?.[sizes.length - 1]

  return {
    id: extractVimeoId(item.uri as string),
    name: item.name as string,
    type: 'file',
    thumbnailUrl: thumb?.link as string | undefined,
    viewUrl: item.link as string | undefined,
    mimeType: 'video',
    fileSize: (item.upload as Record<string, unknown>)?.size as number | undefined,
    durationSeconds: item.duration as number | undefined,
    createdAt: item.created_time as string | undefined,
    metadata: {
      status: (item.transcode as Record<string, unknown>)?.status,
      privacy: (item.privacy as Record<string, unknown>)?.view,
    },
  }
}

class VimeoClient implements IntegrationProviderClient {
  readonly providerName = 'vimeo' as const
  readonly displayName = 'Vimeo'
  readonly capabilities: ProviderCapabilities = {
    canCreateProject: true,
    canUpload: true,
    canBrowse: true,
    canShare: true,
    uploadProtocol: 'tus',
    projectLabel: 'Project',
    acceptedMimeTypes: ['video/*'],
  }

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
        'Content-Type': 'application/json',
        Accept: 'application/vnd.vimeo.*+json;version=3.4',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Vimeo token exchange failed: ${body}`)
    }

    const data = await res.json()
    const user = data.user || {}

    const account: ProviderAccount = {
      id: extractVimeoId(user.uri || ''),
      name: user.name || 'Vimeo User',
      email: user.email,
      avatarUrl: user.pictures?.sizes?.[0]?.link,
    }

    return {
      accessToken: data.access_token as string,
      expiresAt: undefined,
      account,
    }
  }

  async refreshAccessToken(_refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    throw new Error('Vimeo tokens do not expire — reconnect if access is lost')
  }

  async browse(accessToken: string, _accountId: string, path?: string, cursor?: string): Promise<BrowseResult> {
    if (!path) {
      const data = await vimeoFetch(`/me/projects?per_page=50${cursor ? `&page=${cursor}` : ''}`, accessToken)
      const items: BrowseItem[] = (data.data || []).map((p: Record<string, unknown>) => ({
        id: extractVimeoId(p.uri as string),
        name: p.name as string,
        type: 'project' as const,
        metadata: { item_count: (p.metadata as Record<string, unknown>)?.connections },
      }))

      const paging = data.paging || {}
      return {
        items,
        breadcrumb: [{ id: 'root', name: 'Projects' }],
        pagination: { cursor: paging.next ? String((paging.page || 0) + 1) : undefined, hasMore: !!paging.next },
      }
    }

    const data = await vimeoFetch(`/me/projects/${path}/videos?per_page=50${cursor ? `&page=${cursor}` : ''}`, accessToken)
    const items: BrowseItem[] = (data.data || []).map(mapVimeoVideo)

    let projectName = 'Project'
    try {
      const proj = await vimeoFetch(`/me/projects/${path}`, accessToken)
      projectName = proj.name || 'Project'
    } catch {}

    const paging = data.paging || {}
    return {
      items,
      breadcrumb: [{ id: 'root', name: 'Projects' }, { id: path, name: projectName }],
      pagination: { cursor: paging.next ? String((paging.page || 0) + 1) : undefined, hasMore: !!paging.next },
    }
  }

  async getFileDetails(accessToken: string, _accountId: string, fileId: string): Promise<BrowseItem> {
    const data = await vimeoFetch(`/videos/${fileId}`, accessToken)
    return mapVimeoVideo(data)
  }

  async createProject(accessToken: string, _accountId: string, _workspaceId: string, name: string) {
    const data = await vimeoFetch('/me/projects', accessToken, {
      method: 'POST',
      body: JSON.stringify({ name }),
    })

    const projectId = extractVimeoId(data.uri)
    return {
      id: projectId,
      rootFolderId: projectId,
      viewUrl: data.link as string || `https://vimeo.com/manage/folders/${projectId}`,
    }
  }

  async createFileUpload(accessToken: string, _accountId: string, folderId: string, fileName: string, fileSize: number) {
    const data = await vimeoFetch('/me/videos', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        upload: {
          approach: 'tus',
          size: fileSize,
        },
        name: fileName,
        folder_uri: `/me/projects/${folderId}`,
      }),
    })

    const videoId = extractVimeoId(data.uri)
    const tusUrl = data.upload?.upload_link as string

    if (!tusUrl) throw new Error('Vimeo did not return a tus upload URL')

    return {
      fileId: videoId,
      tusUrl,
    }
  }

  async listFolderContents(accessToken: string, _accountId: string, folderId: string, cursor?: string): Promise<BrowseResult> {
    const data = await vimeoFetch(`/me/projects/${folderId}/videos?per_page=50${cursor ? `&page=${cursor}` : ''}`, accessToken)
    const items: BrowseItem[] = (data.data || []).map(mapVimeoVideo)

    const paging = data.paging || {}
    return {
      items,
      breadcrumb: [],
      pagination: { cursor: paging.next ? String((paging.page || 0) + 1) : undefined, hasMore: !!paging.next },
    }
  }

  async createShare(accessToken: string, _accountId: string, assetIds: string[], name: string): Promise<ShareLink> {
    const videoId = assetIds[0]
    await vimeoFetch(`/videos/${videoId}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify({
        privacy: { view: 'unlisted' },
      }),
    })

    const video = await vimeoFetch(`/videos/${videoId}?fields=link`, accessToken)
    return {
      url: video.link as string,
      name,
    }
  }
}

let instance: VimeoClient | null = null

export function createVimeoClient(): IntegrationProviderClient {
  if (!instance) instance = new VimeoClient()
  return instance
}
