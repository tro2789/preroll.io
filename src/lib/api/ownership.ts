import type { createClient } from '@/lib/supabase/server'

/**
 * Shared multi-tenant ownership guards.
 *
 * IMPORTANT: `getAuthenticatedClient()` returns the SERVICE_ROLE client for any
 * `Authorization: Bearer <api-key>` request, which BYPASSES Postgres RLS. Any
 * `/api/v1` route that addresses a resource by a path/body id MUST re-verify that
 * the resource belongs to the caller's org before reading or mutating it, or it
 * is a cross-tenant IDOR. Use these helpers at the top of every such handler.
 *
 * Each helper returns the row (truthy) when the resource is owned by `orgId`, or
 * `null` otherwise. Callers should respond 404/403 on `null`.
 */

type AuthedClient = Awaited<ReturnType<typeof createClient>>

/** Resolve a show owned by `orgId` (via shows -> clients.org_id). Returns the row or null. */
export async function getShowForOrg(
  supabase: AuthedClient,
  showId: string | null | undefined,
  orgId: string
): Promise<{ id: string } | null> {
  if (!showId) return null
  const { data } = await supabase
    .from('shows')
    .select('id, clients!inner(org_id)')
    .eq('id', showId)
    .eq('clients.org_id', orgId)
    .maybeSingle()
  return data ? { id: data.id } : null
}

/** True when the show is owned by `orgId`. */
export async function assertShowOwnedByOrg(
  supabase: AuthedClient,
  showId: string | null | undefined,
  orgId: string
): Promise<boolean> {
  return (await getShowForOrg(supabase, showId, orgId)) !== null
}

/**
 * Resolve an episode owned by `orgId` (via episodes -> shows -> clients.org_id).
 * Mirrors the proven pattern in episodes/[episodeId]/pipeline/route.ts.
 * Returns `{ id, show_id }` or null.
 */
export async function getEpisodeForOrg(
  supabase: AuthedClient,
  episodeId: string | null | undefined,
  orgId: string
): Promise<{ id: string; show_id: string } | null> {
  if (!episodeId) return null
  const { data } = await supabase
    .from('episodes')
    .select('id, show_id, shows(client_id, clients(org_id))')
    .eq('id', episodeId)
    .maybeSingle()
  if (!data) return null
  const show = data.shows as unknown as { clients: { org_id: string } | null } | null
  if (!show?.clients || show.clients.org_id !== orgId) return null
  return { id: data.id as string, show_id: data.show_id as string }
}

/** True when the episode is owned by `orgId`. */
export async function assertEpisodeOwnedByOrg(
  supabase: AuthedClient,
  episodeId: string | null | undefined,
  orgId: string
): Promise<boolean> {
  return (await getEpisodeForOrg(supabase, episodeId, orgId)) !== null
}

/**
 * Assert an episode belongs to `orgId` AND lives under `showId`. Use in
 * shows/[showId]/episodes/[episodeId]/* routes.
 */
export async function getEpisodeForShowAndOrg(
  supabase: AuthedClient,
  episodeId: string | null | undefined,
  showId: string | null | undefined,
  orgId: string
): Promise<{ id: string; show_id: string } | null> {
  const ep = await getEpisodeForOrg(supabase, episodeId, orgId)
  if (!ep) return null
  if (showId && ep.show_id !== showId) return null
  return ep
}

/** Resolve a client owned by `orgId`. Returns the row or null. */
export async function getClientForOrg(
  supabase: AuthedClient,
  clientId: string | null | undefined,
  orgId: string
): Promise<{ id: string } | null> {
  if (!clientId) return null
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('org_id', orgId)
    .maybeSingle()
  return data ? { id: data.id } : null
}

/** True when the client is owned by `orgId`. */
export async function assertClientOwnedByOrg(
  supabase: AuthedClient,
  clientId: string | null | undefined,
  orgId: string
): Promise<boolean> {
  return (await getClientForOrg(supabase, clientId, orgId)) !== null
}

/**
 * Resolve a deliverable owned by `orgId` (via deliverables -> shows -> clients.org_id).
 * Returns `{ id, show_id }` or null.
 */
export async function getDeliverableForOrg(
  supabase: AuthedClient,
  deliverableId: string | null | undefined,
  orgId: string
): Promise<{ id: string; show_id: string | null } | null> {
  if (!deliverableId) return null
  const { data } = await supabase
    .from('deliverables')
    .select('id, show_id, shows(client_id, clients(org_id))')
    .eq('id', deliverableId)
    .maybeSingle()
  if (!data) return null
  const show = data.shows as unknown as { clients: { org_id: string } | null } | null
  if (!show?.clients || show.clients.org_id !== orgId) return null
  return { id: data.id as string, show_id: (data.show_id as string) ?? null }
}
