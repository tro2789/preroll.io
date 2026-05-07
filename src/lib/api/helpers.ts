import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { createHash } from 'crypto'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export async function getAuthenticatedClient() {
  const headerStore = await headers()
  const authHeader = headerStore.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const hash = hashKey(token)

    const serviceClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    const { data: apiKey } = await serviceClient
      .from('api_keys')
      .select('id, user_id')
      .eq('key_hash', hash)
      .single()

    if (!apiKey) {
      return { supabase: null, user: null, error: NextResponse.json({ error: 'Invalid API key' }, { status: 401 }) }
    }

    const { data: { user } } = await serviceClient.auth.admin.getUserById(apiKey.user_id)
    if (!user) {
      return { supabase: null, user: null, error: NextResponse.json({ error: 'User not found' }, { status: 401 }) }
    }

    serviceClient.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKey.id).then(() => {})

    return { supabase: serviceClient, user, error: null }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { supabase: null, user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { supabase, user, error: null }
}

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function getNextPositionInStage(supabase: ReturnType<typeof createClient> extends Promise<infer U> ? U : never, stageId: string): Promise<number> {
  const { data } = await supabase
    .from('episodes')
    .select('position')
    .eq('stage_id', stageId)
    .order('position', { ascending: false })
    .limit(1)
    .single()
  return (data?.position ?? -1) + 1
}
