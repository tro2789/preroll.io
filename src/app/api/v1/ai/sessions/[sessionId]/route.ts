import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { sessionId } = await params
  const supabase = createServiceClient()

  const [{ data: session }, { data: messages }] = await Promise.all([
    supabase
      .from('ai_chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('org_id', org!.id)
      .eq('user_id', user!.id)
      .single(),
    supabase
      .from('ai_chat_messages')
      .select('id, role, content, tool_calls, tool_results, tokens_used, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(50),
  ])

  if (!session) {
    return errorResponse('Session not found', 404)
  }

  return jsonResponse({ messages: messages || [] })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { user, org, error } = await getAuthenticatedClient()
  if (error) return error

  const { sessionId } = await params
  const supabase = createServiceClient()

  const { data: session } = await supabase
    .from('ai_chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('org_id', org!.id)
    .eq('user_id', user!.id)
    .single()

  if (!session) {
    return errorResponse('Session not found', 404)
  }

  await supabase
    .from('ai_chat_sessions')
    .delete()
    .eq('id', sessionId)

  return jsonResponse({ deleted: true })
}
