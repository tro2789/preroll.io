export const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  studio: 'Studio',
}

export const PLAN_BADGE_CLASSES: Record<string, string> = {
  free: 'bg-surface-overlay text-text-secondary',
  pro: 'bg-accent/15 text-accent',
  studio: 'bg-purple-500/15 text-purple-400',
}

export const ROLE_BADGE_CLASSES: Record<string, string> = {
  owner: 'bg-purple-500/15 text-purple-400',
  admin: 'bg-blue-500/15 text-blue-400',
  member: 'bg-surface-overlay text-text-secondary',
}

export const VALID_PLANS = Object.keys(PLAN_LABELS)

export const ORG_COOKIE_NAME = 'preroll_org'
