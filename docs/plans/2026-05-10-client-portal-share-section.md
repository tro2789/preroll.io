# Client Portal Share Section

## Problem

The client portal invite flow is buried in the client detail page sidebar. Producers don't discover it at the natural moment — when they're setting up delivery on an episode and want to loop in their client.

## Solution

Add a "Client Portal" section to the episode detail page, show detail page, and client detail page. It provides a copy-able share link for client onboarding and shows portal access status.

## Three States

### State 1 — Not Invited (no invite_code)
- Header: "Client Portal"
- Context: "Give [Client Name] access to review deliverables and approve episodes"
- Read-only URL field with copy button (invite link auto-generated on render)
- Secondary "Send via email" text button (disabled if client has no email)

### State 2 — Invited, Pending (invite_code set, no onboarded_at)
- Same link field with copy button
- Amber status: "Invited · Pending setup"
- "Resend email" option

### State 3 — Onboarded (onboarded_at set)
- Green status: "[Client Name] has access"
- "View as client" button — opens /portal?preview={clientId} in new tab

## View as Client

Producer preview of the client portal. Portal layout checks if user has a membership (is a producer) and preview param is set, then resolves client from the clientId. Read-only — no approve/reject actions. Banner at top: "You're previewing [Client Name]'s portal view."

## Invite Code Generation

Lazy generation: when the section renders and client has no invite_code, component calls the invite API with `generateOnly=true` to create the code without sending email. Email only sent on explicit "Send via email" click.

## Placement

- **Episode detail page:** Right column, above the delivery panel
- **Show detail page:** Sidebar area
- **Client detail page:** Replaces existing invite button

## Files

- New: `src/components/client-portal-section.tsx`
- New: `src/components/portal/preview-banner.tsx`
- Modify: Episode detail page — add section
- Modify: Show detail page — add section
- Modify: Client detail page — replace invite button
- Modify: `src/app/api/v1/invites/route.ts` — support generateOnly
- Modify: `src/app/portal/layout.tsx` — support preview mode
