import { Hono } from 'hono'
import type { AppContext } from '../types'
import { syncUser } from '../lib/auth'
import { getDb } from '../db'
import { users, payments, applications, enrollments } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { getStripe, isStripeConfigured } from '../lib/stripe'
import { sendEnrollmentConfirmed } from '../lib/email'
import { cohorts } from '../db/schema'
import { autoEnrollOnSignup } from '../lib/enrollment'

const webhookRoutes = new Hono<AppContext>()

/**
 * POST /api/webhooks/clerk — Clerk user sync webhook
 *
 * Handles:
 * - user.created → insert into users table
 * - user.updated → update email/name
 * - user.deleted → soft-delete (mark role as 'deleted')
 *
 * Verifies the webhook signature using Svix headers.
 * If CLERK_WEBHOOK_SECRET is not set, skips verification (dev mode).
 */
webhookRoutes.post('/api/webhooks/clerk', async (c) => {
  const body = await c.req.text()
  const webhookSecret = c.env.CLERK_WEBHOOK_SECRET

  // Verify webhook signature if secret is configured
  if (webhookSecret) {
    const svixId = c.req.header('svix-id')
    const svixTimestamp = c.req.header('svix-timestamp')
    const svixSignature = c.req.header('svix-signature')

    if (!svixId || !svixTimestamp || !svixSignature) {
      return c.json({ error: 'Missing Svix headers' }, 400)
    }

    const isValid = await verifyWebhookSignature(
      body,
      svixId,
      svixTimestamp,
      svixSignature,
      webhookSecret
    )

    if (!isValid) {
      return c.json({ error: 'Invalid webhook signature' }, 401)
    }
  }

  let payload: ClerkWebhookPayload
  try {
    payload = JSON.parse(body)
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const eventType = payload.type

  try {
    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const { id: clerkId, email_addresses, first_name, last_name } = payload.data
        const primaryEmail = email_addresses?.find(
          (e: { id: string }) => e.id === payload.data.primary_email_address_id
        )
        const email = primaryEmail?.email_address || email_addresses?.[0]?.email_address
        if (!email) {
          return c.json({ error: 'No email in webhook payload' }, 400)
        }
        const name = [first_name, last_name].filter(Boolean).join(' ') || null
        const syncedUser = await syncUser(c, clerkId, email, name)
        // On user.created, look for matching approved applications and
        // auto-enroll any sponsored ones; link userId on the rest so the
        // Stripe webhook can find them when payment lands.
        if (eventType === 'user.created') {
          c.executionCtx.waitUntil(
            autoEnrollOnSignup(getDb(c.env.DB), c.env, {
              id: syncedUser.id,
              email: syncedUser.email,
            }),
          )
        }
        break
      }

      case 'user.deleted': {
        const clerkId = payload.data.id
        if (clerkId) {
          const db = getDb(c.env.DB)
          await db
            .update(users)
            .set({ role: 'deleted' })
            .where(eq(users.clerkId, clerkId))
        }
        break
      }

      default:
        // Ignore unhandled event types
        break
    }

    return c.json({ received: true })
  } catch (err) {
    console.error('Webhook processing error:', err)
    return c.json({ error: 'Internal error processing webhook' }, 500)
  }
})

/**
 * POST /api/webhooks/stripe — Stripe payment webhook
 *
 * Handles:
 * - checkout.session.completed → create enrollment + update payment
 */
webhookRoutes.post('/api/webhooks/stripe', async (c) => {
  if (!isStripeConfigured(c.env.STRIPE_SECRET_KEY)) {
    return c.json({ error: 'Stripe not configured' }, 503)
  }

  const body = await c.req.text()
  const sig = c.req.header('stripe-signature')

  if (!sig) {
    return c.json({ error: 'Missing stripe-signature header' }, 400)
  }

  const stripe = getStripe(c.env.STRIPE_SECRET_KEY)

  let event
  try {
    // Verify webhook signature if secret is configured
    if (c.env.STRIPE_WEBHOOK_SECRET) {
      event = await stripe.webhooks.constructEventAsync(body, sig, c.env.STRIPE_WEBHOOK_SECRET)
    } else {
      // Dev mode: parse without verification
      event = JSON.parse(body)
    }
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message)
    return c.json({ error: 'Invalid signature' }, 400)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const applicationId = parseInt(session.metadata?.application_id || '0', 10)
    const cohortId = parseInt(session.metadata?.cohort_id || '0', 10)

    if (!applicationId || !cohortId) {
      console.error('Missing metadata in Stripe session:', session.id)
      return c.json({ received: true })
    }

    const db = getDb(c.env.DB)

    try {
      // Update or create payment record
      const existingPayment = await db.select().from(payments)
        .where(eq(payments.applicationId, applicationId))
        .get()

      if (existingPayment) {
        await db.update(payments)
          .set({
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
            status: 'completed',
            paidAt: new Date().toISOString(),
          })
          .where(eq(payments.id, existingPayment.id))
      } else {
        await db.insert(payments).values({
          applicationId,
          cohortId,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: session.payment_intent,
          amountCents: session.amount_total || 0,
          status: 'completed',
          paidAt: new Date().toISOString(),
        })
      }

      // Update application status to enrolled
      await db.update(applications)
        .set({ status: 'enrolled' })
        .where(eq(applications.id, applicationId))

      // If the applicant has a user account, create enrollment.
      // UNIQUE(user_id, cohort_id) makes the insert idempotent — we
      // catch the constraint violation if /payment/success already ran.
      const app = await db.select().from(applications).where(eq(applications.id, applicationId)).get()
      if (app?.userId) {
        try {
          await db.insert(enrollments).values({
            userId: app.userId,
            cohortId,
            status: 'active',
          })
        } catch (e) {
          // Enrollment already exists from the success-page path. Expected.
        }

        // Link payment to user
        await db.update(payments)
          .set({ userId: app.userId })
          .where(eq(payments.applicationId, applicationId))
      }

      // Send enrollment confirmation email (reuse `app` from above)
      const cohort = await db.select().from(cohorts).where(eq(cohorts.id, cohortId)).get()
      const appForEmail = app || await db.select().from(applications).where(eq(applications.id, applicationId)).get()
      if (appForEmail && cohort) {
        c.executionCtx.waitUntil(
          sendEnrollmentConfirmed(c.env, appForEmail.email, appForEmail.name, cohort.title)
        )
      }

      console.log(`Payment completed for application ${applicationId}, cohort ${cohortId}`)
    } catch (err) {
      console.error('Error processing Stripe webhook:', err)
      return c.json({ error: 'Processing error' }, 500)
    }
  }

  return c.json({ received: true })
})

/**
 * Verify Svix webhook signature.
 * Uses HMAC-SHA256 with the webhook secret.
 * This is a lightweight implementation that doesn't require the svix package.
 */
async function verifyWebhookSignature(
  body: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string
): Promise<boolean> {
  // Check timestamp is not too old (5 minutes tolerance)
  const timestamp = parseInt(svixTimestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > 300) {
    return false
  }

  // The secret from Clerk starts with "whsec_" — strip that prefix
  const secretBytes = base64ToArrayBuffer(secret.replace(/^whsec_/, ''))

  // The signature payload is: "{svixId}.{svixTimestamp}.{body}"
  const signaturePayload = `${svixId}.${svixTimestamp}.${body}`
  const encoder = new TextEncoder()
  const data = encoder.encode(signaturePayload)

  // Import key and sign
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, data)
  const expectedSignature = arrayBufferToBase64(signature)

  // Svix sends multiple signatures separated by space, each prefixed with "v1,"
  const signatures = svixSignature.split(' ')
  for (const sig of signatures) {
    const [version, sigValue] = sig.split(',')
    if (version === 'v1' && sigValue === expectedSignature) {
      return true
    }
  }

  return false
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Types for Clerk webhook payloads
type ClerkWebhookPayload = {
  type: string
  data: {
    id: string
    email_addresses?: Array<{
      id: string
      email_address: string
    }>
    primary_email_address_id?: string
    first_name?: string
    last_name?: string
  }
}

export default webhookRoutes
