export type GenerationType =
  | 'show_notes'
  | 'description'
  | 'social_twitter'
  | 'social_linkedin'
  | 'social_instagram'
  | 'title_suggestions'

export const ALL_GENERATION_TYPES: GenerationType[] = [
  'show_notes',
  'description',
  'title_suggestions',
  'social_twitter',
  'social_linkedin',
  'social_instagram',
]

export const GENERATION_LABELS: Record<GenerationType, string> = {
  show_notes: 'Show Notes',
  description: 'Description',
  title_suggestions: 'Title Suggestions',
  social_twitter: 'X / Twitter',
  social_linkedin: 'LinkedIn',
  social_instagram: 'Instagram',
}

export const CREDIT_COSTS: Record<GenerationType, number> = {
  show_notes: 3,
  description: 2,
  social_twitter: 1,
  social_linkedin: 1,
  social_instagram: 1,
  title_suggestions: 1,
}

export const MAX_CONCURRENT_TRANSCRIPTIONS = 3
