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
  standard: { label: 'Full Price', amountCents: 50000 },     // $500
  discounted: { label: 'Discounted', amountCents: 25000 },   // $250 (alumni, RegenHub)
  sponsor: { label: 'Sponsored', amountCents: 0 },           // $0 — free
}

export function getAmountForTier(tier: string): number {
  return PRICING_TIERS[tier]?.amountCents ?? 50000
}

/**
 * Compute the actual amount to charge for an application.
 * If the admin set a custom `approvedAmountCents`, that wins.
 * Otherwise fall back to the tier's default amount.
 */
export function getApplicationAmount(app: { pricingTier: string; approvedAmountCents?: number | null }): number {
  if (app.approvedAmountCents != null) return app.approvedAmountCents
  return getAmountForTier(app.pricingTier)
}

/**
 * Human-readable label for an application's approved price. Returns the
 * tier label (e.g. "Full Price", "Sponsored"). Callers display the actual
 * dollar amount alongside via formatCents(approvedAmountCents) so a custom
 * approval amount surfaces naturally in the UI without a separate label.
 */
export function getApplicationLabel(app: { pricingTier: string }): string {
  return getTierLabel(app.pricingTier)
}

export function getTierLabel(tier: string): string {
  return PRICING_TIERS[tier]?.label ?? 'Standard'
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

