export type IntegrationProvider = 'frame_io' | 'google_drive' | 'vimeo' | 'dropbox'

export interface OAuthConfig {
  authUrl: string
  tokenUrl: string
  clientId: string
  clientSecret: string
  scopes: string[]
  callbackPath: string
}

export interface ProviderAccount {
  id: string
  name: string
  email?: string
  avatarUrl?: string
}

export interface BrowseItem {
  id: string
  name: string
  type: 'folder' | 'file' | 'project' | 'workspace'
  thumbnailUrl?: string
  mimeType?: string
  fileSize?: number
  durationSeconds?: number
  metadata?: Record<string, unknown>
  childrenCount?: number
}

export interface BrowseResult {
  items: BrowseItem[]
  breadcrumb: { id: string; name: string }[]
  pagination?: { cursor?: string; hasMore: boolean }
}

export interface ShareLink {
  url: string
  name: string
  expiresAt?: string
}

export interface IntegrationProviderClient {
  readonly providerName: IntegrationProvider
  readonly displayName: string
  readonly oauthConfig: OAuthConfig

  getAuthUrl(state: string, redirectUri: string): string
  exchangeCode(code: string, redirectUri: string): Promise<{
    accessToken: string
    refreshToken?: string
    expiresAt?: Date
    account: ProviderAccount
  }>
  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string
    refreshToken?: string
    expiresAt?: Date
  }>

  browse(accessToken: string, accountId: string, path?: string, cursor?: string): Promise<BrowseResult>
  getFileDetails(accessToken: string, accountId: string, fileId: string): Promise<BrowseItem>

  createShare?(accessToken: string, accountId: string, assetIds: string[], name: string): Promise<ShareLink>
  verifyWebhookSignature?(payload: string, signature: string, timestamp: string): boolean
}
