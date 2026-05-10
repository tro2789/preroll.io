import { getAuthenticatedClient, jsonResponse, errorResponse } from '@/lib/api/helpers'
import { getStripe } from '@/lib/stripe/client'
import { isSelfHosted } from '@/lib/entitlements'
import { getSiteUrl } from '@/lib/email/send'

const CREDIT_PACKS: Record<string, { credits: number; priceEnvVar: string }> = {
  starter: { credits: 100, priceEnvVar: 'STRIPE_AI_100_PRICE_ID' },
  growth: { credits: 500, priceEnvVar: 'STRIPE_AI_500_PRICE_ID' },
  scale: { credits: 1000, priceEnvVar: 'STRIPE_AI_1000_PRICE_ID' },
}

export async function POST(request: Request) {
  if (isSelfHosted()) return errorResponse('Not available in self-hosted mode', 404)

  const { org, error } = await getAuthenticatedClient()
  if (error) return error

  const body = await request.json()
  const { pack } = body as { pack: string }

  const packConfig = CREDIT_PACKS[pack]
  if (!packConfig) {
    return errorResponse(`Invalid pack. Choose: ${Object.keys(CREDIT_PACKS).join(', ')}`)
  }

  const priceId = process.env[packConfig.priceEnvVar]
  if (!priceId) {
    return errorResponse('Credit pack pricing not configured', 500)
  }

  const stripe = getStripe()
  const siteUrl = getSiteUrl()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    client_reference_id: org!.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/app/settings/ai?purchase=success`,
    cancel_url: `${siteUrl}/app/settings/ai?purchase=cancelled`,
    metadata: {
      type: 'ai_credits',
      credits: String(packConfig.credits),
      pack,
    },
  })

  return jsonResponse({ url: session.url })
}
