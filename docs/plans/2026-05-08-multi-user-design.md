# Multi-User / Team Support

## Overview

Allow org owners and admins to invite team members (editors, VAs, subcontractors) to their workspace. All members see all data. Roles control what actions they can take.

## Roles

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| View all clients/shows/episodes | Y | Y | Y |
| Create/edit episodes, pipeline, deliverables, uploads | Y | Y | Y |
| Create/edit clients and shows | Y | Y | N |
| Manage integrations | Y | Y | N |
| Invite/remove team members | Y | Y | N |
| Manage API keys and webhooks | Y | Y | N |
| Manage billing | Y | N | N |
| Delete clients/shows | Y | N | N |

## Database

**New table: `team_invites`**
- id, org_id, email, role (org_role), invited_by, token, accepted_at, expires_at, created_at

**RLS updates:**
- `team_invites`: org members can SELECT/INSERT/DELETE for their org
- `memberships`: add INSERT policy for admin+ to add members, DELETE policy for admin+ to remove non-owners

## API Routes

- `GET /api/v1/team` — list members + pending invites
- `POST /api/v1/team/invite` — create invite, send email (admin+, gated on `multi_user` entitlement)
- `DELETE /api/v1/team/invites/[inviteId]` — cancel pending invite (admin+)
- `DELETE /api/v1/team/[memberId]` — remove member (admin+, cannot remove owners)
- `POST /api/v1/team/join` — accept invite (authenticated, token in body)

## Invite Flow

1. Admin enters email + role → POST /team/invite
2. System creates team_invite row, sends email via Resend with magic link
3. Link goes to `/auth/verify?...&next=/team/join?token=xxx`
4. New users sign up, existing users log in
5. `/team/join` page calls POST /team/join with token
6. Backend validates token, creates membership, marks invite accepted
7. Redirect to /app

## Role Enforcement

New helper: `requireRole(org, 'admin')` returns error response or null.

Added to existing routes:
- POST/DELETE clients, shows → admin+
- POST webhook-endpoints, api-keys, integrations/auth-url → admin+ (already have entitlement checks, add role check)
- POST stripe/checkout, stripe/portal → owner only
- POST/DELETE team routes → admin+

## UI

- New settings tab "Team" at `/app/settings/team`
- Member list with role badges, remove button
- Invite form: email input + role dropdown (member/admin)
- Pending invites list with cancel button
- `/team/join` page for accepting invites

## Entitlement Gate

`multi_user` feature flag — currently enabled only on Studio tier. Free/Pro orgs get the single-owner membership but cannot invite additional members.
