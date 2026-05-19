const BRAND_COLOR = '#e86a47'
const TEXT_PRIMARY = '#1a1a1a'
const TEXT_SECONDARY = '#6b7280'
const TEXT_MUTED = '#9ca3af'
const BG_HIGHLIGHT = '#f9fafb'
const BORDER_COLOR = '#e5e7eb'

interface EmailSection {
  greeting?: string
  body: string
  cta?: { label: string; url: string }
  footer?: string
}

export function emailTemplate({ greeting, body, cta, footer }: EmailSection): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6;">
    <tr><td align="center" style="padding: 40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
        <!-- Header -->
        <tr><td style="padding: 32px 32px 0; border-bottom: 1px solid ${BORDER_COLOR}; padding-bottom: 24px;">
          <span style="font-size: 18px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: ${TEXT_PRIMARY};">PREROLL</span><span style="font-size: 18px; font-weight: 700; letter-spacing: 2px; color: ${BRAND_COLOR};">.IO</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding: 32px;">
          ${greeting ? `<p style="font-size: 15px; color: ${TEXT_PRIMARY}; line-height: 1.6; margin: 0 0 16px;">${greeting}</p>` : ''}
          <div style="font-size: 15px; color: ${TEXT_PRIMARY}; line-height: 1.6;">${body}</div>
          ${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0 8px;">
            <tr><td style="background-color: ${BRAND_COLOR}; border-radius: 8px;">
              <a href="${cta.url}" style="display: inline-block; padding: 12px 28px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">${cta.label}</a>
            </td></tr>
          </table>` : ''}
          ${footer ? `<p style="font-size: 13px; color: ${TEXT_SECONDARY}; line-height: 1.5; margin: 20px 0 0;">${footer}</p>` : ''}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding: 24px 32px; background-color: ${BG_HIGHLIGHT}; border-top: 1px solid ${BORDER_COLOR};">
          <p style="font-size: 12px; color: ${TEXT_MUTED}; line-height: 1.5; margin: 0;">preroll.io &mdash; Podcast production, organized.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function emailHighlightBlock(content: string): string {
  return `<div style="background: ${BG_HIGHLIGHT}; border: 1px solid ${BORDER_COLOR}; border-radius: 8px; padding: 16px; margin: 16px 0;">${content}</div>`
}
