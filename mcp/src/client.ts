const DEFAULT_BASE = 'https://preroll.io'

export class PreRollClient {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.apiKey = apiKey
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (res.status === 204) return null

    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || `API error ${res.status}`)
    }
    return json.data
  }

  async get(path: string): Promise<unknown> { return this.request('GET', path) }
  async post(path: string, body: unknown): Promise<unknown> { return this.request('POST', path, body) }
  async patch(path: string, body: unknown): Promise<unknown> { return this.request('PATCH', path, body) }
  async del(path: string): Promise<unknown> { return this.request('DELETE', path) }

  static fromEnv(): PreRollClient {
    const apiKey = process.env.PREROLL_API_KEY
    if (!apiKey) throw new Error('PREROLL_API_KEY environment variable is required')
    const baseUrl = process.env.PREROLL_BASE_URL || DEFAULT_BASE
    return new PreRollClient(baseUrl, apiKey)
  }
}
