import type { IntegrationProviderClient, OAuthConfig, BrowseResult, BrowseItem, ShareLink, ProviderAccount, ProviderCapabilities } from '../types'

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3'
const SCOPES = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive']

const FILE_FIELDS = 'id,name,mimeType,size,thumbnailLink,webViewLink,createdTime,iconLink'

function getOAuthConfig(): OAuthConfig {
  return {
    authUrl: GOOGLE_AUTH,
    tokenUrl: GOOGLE_TOKEN,
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',
    scopes: SCOPES,
    callbackPath: '/auth/integrations/google_drive/callback',
  }
}

async function driveFetch(path: string, token: string, options?: RequestInit) {
  const base = path.startsWith('/upload') ? DRIVE_UPLOAD : DRIVE_API
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
    throw new Error(`Google Drive API error ${res.status}: ${body}`)
  }
  return res
}

async function driveJson(path: string, token: string, options?: RequestInit) {
  const res = await driveFetch(path, token, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  return res.json()
}

function mapDriveItem(item: Record<string, unknown>): BrowseItem {
  const mimeType = item.mimeType as string
  const isFolder = mimeType === 'application/vnd.google-apps.folder'
  return {
    id: item.id as string,
    name: item.name as string,
    type: isFolder ? 'folder' : 'file',
    thumbnailUrl: item.thumbnailLink as string | undefined,
    viewUrl: item.webViewLink as string | undefined,
    mimeType: isFolder ? undefined : mimeType,
    fileSize: item.size ? Number(item.size) : undefined,
    createdAt: item.createdTime as string | undefined,
  }
}

class GoogleDriveClient implements IntegrationProviderClient {
  readonly providerName = 'google_drive' as const
  readonly displayName = 'Google Drive'
  readonly capabilities: ProviderCapabilities = {
    canCreateProject: true,
    canUpload: true,
    canBrowse: true,
    canShare: true,
    uploadProtocol: 'resumable',
    projectLabel: 'Folder',
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
      throw new Error(`Google token exchange failed: ${body}`)
    }

    const tokens = await res.json()
    const about = await driveJson('/about?fields=user', tokens.access_token)
    const user = about.user || {}

    const account: ProviderAccount = {
      id: user.permissionId || 'unknown',
      name: user.displayName || user.emailAddress || 'Google User',
      email: user.emailAddress,
      avatarUrl: user.photoLink,
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
      throw new Error(`Google token refresh failed: ${body}`)
    }

    const tokens = await res.json()
    return {
      accessToken: tokens.access_token as string,
      refreshToken: tokens.refresh_token as string | undefined,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
    }
  }

  async browse(accessToken: string, _accountId: string, path?: string, cursor?: string): Promise<BrowseResult> {
    const folderId = path || 'root'
    const q = `'${folderId}' in parents and trashed = false`
    let url = `/files?q=${encodeURIComponent(q)}&fields=nextPageToken,files(${FILE_FIELDS})&orderBy=folder,name&pageSize=50`
    if (cursor) url += `&pageToken=${cursor}`

    const data = await driveJson(url, accessToken)
    const items: BrowseItem[] = (data.files || []).map(mapDriveItem)

    let breadcrumbName = 'My Drive'
    if (path && path !== 'root') {
      try {
        const folder = await driveJson(`/files/${path}?fields=name`, accessToken)
        breadcrumbName = folder.name || 'Folder'
      } catch {}
    }

    return {
      items,
      breadcrumb: [{ id: 'root', name: 'My Drive' }, ...(path && path !== 'root' ? [{ id: path, name: breadcrumbName }] : [])],
      pagination: { cursor: data.nextPageToken, hasMore: !!data.nextPageToken },
    }
  }

  async getFileDetails(accessToken: string, _accountId: string, fileId: string): Promise<BrowseItem> {
    const data = await driveJson(`/files/${fileId}?fields=${FILE_FIELDS}`, accessToken)
    return mapDriveItem(data)
  }

  async createProject(accessToken: string, _accountId: string, _workspaceId: string, name: string) {
    const parentId = await this.getOrCreatePreRollFolder(accessToken)

    const data = await driveJson('/files', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      }),
    })

    return {
      id: data.id as string,
      rootFolderId: data.id as string,
      viewUrl: `https://drive.google.com/drive/folders/${data.id}`,
    }
  }

  private async getOrCreatePreRollFolder(accessToken: string): Promise<string> {
    const q = `name = 'PreRoll' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`
    const search = await driveJson(`/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`, accessToken)

    if (search.files?.length > 0) {
      return search.files[0].id as string
    }

    const created = await driveJson('/files', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        name: 'PreRoll',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    })

    return created.id as string
  }

  async createFileUpload(accessToken: string, _accountId: string, folderId: string, fileName: string, fileSize: number) {
    const res = await driveFetch('/upload/files?uploadType=resumable', accessToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Upload-Content-Length': String(fileSize),
      },
      body: JSON.stringify({
        name: fileName,
        parents: [folderId],
      }),
    })

    const resumableUrl = res.headers.get('location')
    if (!resumableUrl) throw new Error('Google Drive did not return a resumable upload URL')

    return {
      fileId: '',
      resumableUrl,
    }
  }

  async listFolderContents(accessToken: string, _accountId: string, folderId: string, cursor?: string): Promise<BrowseResult> {
    const q = `'${folderId}' in parents and trashed = false`
    let url = `/files?q=${encodeURIComponent(q)}&fields=nextPageToken,files(${FILE_FIELDS})&orderBy=createdTime desc&pageSize=50`
    if (cursor) url += `&pageToken=${cursor}`

    const data = await driveJson(url, accessToken)
    const items: BrowseItem[] = (data.files || []).map(mapDriveItem)

    return {
      items,
      breadcrumb: [],
      pagination: { cursor: data.nextPageToken, hasMore: !!data.nextPageToken },
    }
  }

  async createShare(accessToken: string, _accountId: string, assetIds: string[], name: string): Promise<ShareLink> {
    const fileId = assetIds[0]
    await driveJson(`/files/${fileId}/permissions`, accessToken, {
      method: 'POST',
      body: JSON.stringify({ type: 'anyone', role: 'reader' }),
    })

    const file = await driveJson(`/files/${fileId}?fields=webViewLink`, accessToken)

    return {
      url: file.webViewLink,
      name,
    }
  }
}

let instance: GoogleDriveClient | null = null

export function createGoogleDriveClient(): IntegrationProviderClient {
  if (!instance) instance = new GoogleDriveClient()
  return instance
}
