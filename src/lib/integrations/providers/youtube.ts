import type { IntegrationProviderClient, OAuthConfig, BrowseResult, BrowseItem, ProviderAccount, ProviderCapabilities } from '../types'

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
const YT_API = 'https://www.googleapis.com/youtube/v3'
const YT_UPLOAD = 'https://www.googleapis.com/upload/youtube/v3'
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.upload',
]

export function getOAuthConfig(): OAuthConfig {
  return {
    authUrl: GOOGLE_AUTH,
    tokenUrl: GOOGLE_TOKEN,
    clientId: process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_DRIVE_CLIENT_ID || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',
    scopes: SCOPES,
    callbackPath: '/auth/integrations/youtube/callback',
  }
}

export const YT_API_BASE = YT_API
export const YT_UPLOAD_BASE = YT_UPLOAD

export async function ytFetch(path: string, token: string, options?: RequestInit) {
  const base = path.startsWith('http') ? '' : YT_API
  const url = path.startsWith('http') ? path : `${base}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`YouTube API error ${res.status}: ${body}`)
  }
  return res
}

export async function ytJson(path: string, token: string, options?: RequestInit) {
  const res = await ytFetch(path, token, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  return res.json()
}

class YouTubeClient implements IntegrationProviderClient {
  readonly providerName = 'youtube' as const
  readonly displayName = 'YouTube'
  readonly capabilities: ProviderCapabilities = {
    canCreateProject: true,
    canUpload: true,
    canBrowse: true,
    canShare: false,
    uploadProtocol: 'resumable',
    projectLabel: 'Playlist',
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
      access_type: 'offline',
      prompt: 'consent',
    })
    return `${config.authUrl}?${params.toString()}`
  }

  async exchangeCode(code: string, redirectUri: string) {
    const config = this.oauthConfig
    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }).toString(),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`YouTube token exchange failed: ${body}`)
    }

    const tokens = await res.json()
    const channels = await ytJson('/channels?part=snippet&mine=true', tokens.access_token)
    const channel = channels.items?.[0]

    const account: ProviderAccount = {
      id: channel?.id || 'unknown',
      name: channel?.snippet?.title || 'YouTube User',
      email: undefined,
      avatarUrl: channel?.snippet?.thumbnails?.default?.url,
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
    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }).toString(),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`YouTube token refresh failed: ${body}`)
    }

    const tokens = await res.json()
    return {
      accessToken: tokens.access_token as string,
      refreshToken: tokens.refresh_token as string | undefined,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
    }
  }

  async browse(accessToken: string, _accountId: string, path?: string, cursor?: string): Promise<BrowseResult> {
    if (path) {
      let url = `/playlistItems?part=snippet,contentDetails&playlistId=${path}&maxResults=50`
      if (cursor) url += `&pageToken=${cursor}`
      const data = await ytJson(url, accessToken)
      const items: BrowseItem[] = (data.items || []).map((item: Record<string, unknown>) => {
        const snippet = item.snippet as Record<string, unknown>
        const contentDetails = item.contentDetails as Record<string, unknown>
        const thumbnails = snippet?.thumbnails as Record<string, Record<string, unknown>> | undefined
        return {
          id: (contentDetails?.videoId as string) || (item.id as string),
          name: (snippet?.title as string) || 'Untitled',
          type: 'file' as const,
          thumbnailUrl: thumbnails?.medium?.url as string | undefined,
          viewUrl: `https://youtube.com/watch?v=${contentDetails?.videoId}`,
        }
      })
      return {
        items,
        breadcrumb: [{ id: 'root', name: 'Playlists' }, { id: path, name: 'Playlist' }],
        pagination: { cursor: data.nextPageToken, hasMore: !!data.nextPageToken },
      }
    }

    let url = '/playlists?part=snippet,contentDetails&mine=true&maxResults=50'
    if (cursor) url += `&pageToken=${cursor}`
    const data = await ytJson(url, accessToken)
    const items: BrowseItem[] = (data.items || []).map((item: Record<string, unknown>) => {
      const snippet = item.snippet as Record<string, unknown>
      const contentDetails = item.contentDetails as Record<string, unknown>
      const thumbnails = snippet?.thumbnails as Record<string, Record<string, unknown>> | undefined
      return {
        id: item.id as string,
        name: (snippet?.title as string) || 'Untitled',
        type: 'folder' as const,
        thumbnailUrl: thumbnails?.medium?.url as string | undefined,
        childrenCount: contentDetails?.itemCount as number | undefined,
      }
    })

    return {
      items,
      breadcrumb: [{ id: 'root', name: 'Playlists' }],
      pagination: { cursor: data.nextPageToken, hasMore: !!data.nextPageToken },
    }
  }

  async getFileDetails(accessToken: string, _accountId: string, fileId: string): Promise<BrowseItem> {
    const data = await ytJson(`/videos?part=snippet,contentDetails,status&id=${fileId}`, accessToken)
    const video = data.items?.[0]
    if (!video) throw new Error('Video not found')
    const snippet = video.snippet as Record<string, unknown>
    const thumbnails = snippet?.thumbnails as Record<string, Record<string, unknown>> | undefined
    return {
      id: video.id as string,
      name: (snippet?.title as string) || 'Untitled',
      type: 'file',
      thumbnailUrl: thumbnails?.medium?.url as string | undefined,
      viewUrl: `https://youtube.com/watch?v=${video.id}`,
    }
  }

  async createProject(accessToken: string, _accountId: string, _workspaceId: string, name: string) {
    const data = await ytJson('/playlists?part=snippet,status', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        snippet: { title: name },
        status: { privacyStatus: 'private' },
      }),
    })
    return {
      id: data.id as string,
      rootFolderId: data.id as string,
      viewUrl: `https://youtube.com/playlist?list=${data.id}`,
    }
  }

  async createFileUpload(accessToken: string, _accountId: string, _folderId: string, fileName: string, fileSize: number) {
    const res = await ytFetch(
      `${YT_UPLOAD}/videos?uploadType=resumable&part=snippet,status`,
      accessToken,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Upload-Content-Length': String(fileSize),
          'X-Upload-Content-Type': 'video/*',
        },
        body: JSON.stringify({
          snippet: {
            title: fileName.replace(/\.[^.]+$/, ''),
            description: '',
          },
          status: {
            privacyStatus: 'unlisted',
            selfDeclaredMadeForKids: false,
          },
        }),
      }
    )

    const resumableUrl = res.headers.get('location')
    if (!resumableUrl) throw new Error('YouTube did not return a resumable upload URL')

    return {
      fileId: '',
      resumableUrl,
    }
  }

  async deleteFile(accessToken: string, _accountId: string, fileId: string): Promise<void> {
    const res = await fetch(`${YT_API}/videos?id=${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`YouTube API error ${res.status}: ${body}`)
    }
  }

  async listFolderContents(accessToken: string, accountId: string, folderId: string, cursor?: string): Promise<BrowseResult> {
    return this.browse(accessToken, accountId, folderId, cursor)
  }
}

let instance: YouTubeClient | null = null

export function createYouTubeClient(): IntegrationProviderClient {
  if (!instance) instance = new YouTubeClient()
  return instance
}
