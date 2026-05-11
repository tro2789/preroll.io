export interface Deliverable {
  id: string
  type: string
  title: string
  description: string | null
  file_url: string | null
  file_key: string | null
  status: string
  producer_notes: string | null
  reviewer_notes: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  version_group_id?: string | null
  file_reference_id?: string | null
}

export interface FileVersion {
  id: string
  name: string
  version_number: number
  is_latest: boolean
  thumbnail_url: string | null
  mime_type: string | null
  file_size: number | null
  duration_seconds: number | null
  external_url: string | null
  created_at: string
}

export const DELIVERABLE_TYPES = [
  { value: 'rough_cut', label: 'Rough Cut' },
  { value: 'final_cut', label: 'Final Cut' },
  { value: 'thumbnail', label: 'Thumbnail' },
  { value: 'show_notes', label: 'Show Notes' },
  { value: 'cover_art', label: 'Cover Art' },
  { value: 'intro', label: 'Intro' },
  { value: 'outro', label: 'Outro' },
  { value: 'social_clip', label: 'Social Clip' },
  { value: 'other', label: 'Other' },
] as const

export const TYPE_LABELS: Record<string, string> = {
  rough_cut: 'Rough Cut',
  final_cut: 'Final Cut',
  thumbnail: 'Thumbnail',
  show_notes: 'Show Notes',
  cover_art: 'Cover Art',
  intro: 'Intro',
  outro: 'Outro',
  social_clip: 'Social Clip',
  other: 'Other',
}

export const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Pending' },
  approved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Approved' },
  revision_requested: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Revision Requested' },
}
