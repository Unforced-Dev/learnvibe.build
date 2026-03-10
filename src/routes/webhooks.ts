import { Hono } from 'hono'
import type { AppContext } from '../types'
import { syncUser } from '../lib/auth'
import { getDb } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

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
        await syncUser(c, clerkId, email, name)
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
