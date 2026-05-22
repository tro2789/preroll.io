import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { resolveUserOrg, resolveOrgFromApiKey, type OrgContext } from '@/lib/org/resolve'
import { ORG_COOKIE_NAME } from '@/lib/constants/plans'

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export async function getAuthenticatedClient() {
  const { headers } = await import('next/headers')
  const headerStore = await headers()
  const authHeader = headerStore.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const hash = hashKey(token)

    const serviceClient = createServiceClient()

    const { data: apiKey } = await serviceClient
      .from('api_keys')
      .select('id, user_id, org_id')
      .eq('key_hash', hash)
      .single()

    if (!apiKey) {
      return { supabase: null, user: null, org: null as OrgContext | null, error: NextResponse.json({ error: 'Invalid API key' }, { status: 401 }) }
    }

    const { data: { user } } = await serviceClient.auth.admin.getUserById(apiKey.user_id)
    if (!user) {
      return { supabase: null, user: null, org: null as OrgContext | null, error: NextResponse.json({ error: 'User not found' }, { status: 401 }) }
    }

    const org = await resolveOrgFromApiKey(apiKey.org_id, apiKey.user_id)
    if (!org) {
      return { supabase: null, user: null, org: null as OrgContext | null, error: NextResponse.json({ error: 'Organization not found' }, { status: 401 }) }
    }

    serviceClient.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKey.id).then(() => {})

    return { supabase: serviceClient, user, org, error: null }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { supabase: null, user: null, org: null as OrgContext | null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const cookieStore = await cookies()
  const preferredOrgId = cookieStore.get(ORG_COOKIE_NAME)?.value
  const org = await resolveUserOrg(user.id, preferredOrgId)
  if (!org) {
    return { supabase: null, user: null, org: null as OrgContext | null, error: NextResponse.json({ error: 'No organization found' }, { status: 401 }) }
  }

  return { supabase, user, org, error: null }
}

export async function getAuthenticatedClientOrPortalUser() {
  const result = await getAuthenticatedClient()

  if (!result.error) {
    return { ...result, portalUserId: null as string | null }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ...result, portalUserId: null as string | null }
  }

  const { data: clientCheck } = await supabase
    .from('clients')
    .select('id')
    .eq('client_user_id', user.id)
    .limit(1)
    .single()

  if (!clientCheck) {
    return { ...result, portalUserId: null as string | null }
  }

  return {
    supabase,
    user,
    org: null as OrgContext | null,
    error: null as NextResponse | null,
    portalUserId: user.id as string | null,
  }
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
