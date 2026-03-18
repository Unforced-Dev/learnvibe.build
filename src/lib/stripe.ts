import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe(secretKey: string): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia' as any,
      httpClient: Stripe.createFetchHttpClient(),
    })
  }
  return stripeClient
}

export function isStripeConfigured(secretKey: string | undefined): boolean {
  return !!secretKey && secretKey.startsWith('sk_') && secretKey.length > 10
}

/**
 * Pricing tiers map to actual amounts in cents.
 * Admin sets the tier when approving an application.
 */
export const PRICING_TIERS: Record<string, { label: string; amountCents: number }> = {
  standard: { label: 'Standard', amountCents: 50000 },     // $500
  early_bird: { label: 'Early Bird', amountCents: 35000 },  // $350
  scholarship: { label: 'Scholarship', amountCents: 15000 }, // $150
  sponsor: { label: 'Sponsored', amountCents: 0 },           // $0 — free
}

export function getAmountForTier(tier: string): number {
  return PRICING_TIERS[tier]?.amountCents ?? 50000
}

export function getTierLabel(tier: string): string {
  return PRICING_TIERS[tier]?.label ?? 'Standard'
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

interface CreateCheckoutParams {
  stripe: Stripe
  applicationId: number
  applicantEmail: string
  applicantName: string
  cohortTitle: string
  cohortId: number
  amountCents: number
  baseUrl: string
}

/**
 * Create a Stripe Checkout session for cohort payment.
 * Returns the Checkout Session URL to redirect to.
 */
export async function createCheckoutSession(params: CreateCheckoutParams): Promise<string> {
  const {
    stripe,
    applicationId,
    applicantEmail,
    applicantName,
    cohortTitle,
    cohortId,
    amountCents,
    baseUrl,
  } = params

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: applicantEmail,
    allow_promotion_codes: true,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: cohortTitle,
            description: `Learn Vibe Build enrollment — ${cohortTitle}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      application_id: String(applicationId),
      cohort_id: String(cohortId),
      applicant_name: applicantName,
    },
    success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/payment/cancelled?application_id=${applicationId}`,
  })

  return session.url!
}
