import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function getAuthenticatedClient() {
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
