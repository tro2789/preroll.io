import type { SupabaseClient } from '@supabase/supabase-js'

const AUTO_ARCHIVE_DAYS = 14

export async function autoArchiveApprovedEpisodes(supabase: SupabaseClient) {
  const cutoff = new Date(Date.now() - AUTO_ARCHIVE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  await supabase
    .from('episodes')
    .update({ archived_at: new Date().toISOString() })
    .eq('status', 'approved')
    .is('archived_at', null)
    .lt('stage_entered_at', cutoff)
}
