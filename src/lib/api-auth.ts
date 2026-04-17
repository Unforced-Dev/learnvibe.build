import { Context } from 'hono'
import { eq, and, ne } from 'drizzle-orm'
import { getDb } from '../db'
import { apiKeys, users, enrollments, memberships } from '../db/schema'
import type { AppContext } from '../types'
import type { AuthUser } from './auth'

/**
 * Generate a cryptographically random API key.
 * Format: lvb_<32 random hex chars>
 */
export function generateApiKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `lvb_${hex}`
}

/**
 * Hash an API key using SHA-256 for storage.
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Get the display prefix from an API key (first 8 chars + ...).
 */
export function getKeyPrefix(key: string): string {
  return key.slice(0, 12) + '...'
}

/**
 * Authenticate a request via Bearer token (API key).
 * Returns the user if authenticated, null otherwise.
 */
export async function authenticateApiKey(
  c: Context<AppContext>
): Promise<AuthUser | null> {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const key = authHeader.slice(7).trim()
  if (!key || !key.startsWith('lvb_')) return null

  const keyHash = await hashApiKey(key)
  const db = getDb(c.env.DB)

  const result = await db
    .select({
      apiKey: apiKeys,
      user: {
        id: users.id,
        clerkId: users.clerkId,
        email: users.email,
        name: users.name,
        role: users.role,
      },
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(
      and(
        eq(apiKeys.keyHash, keyHash),
        eq(apiKeys.status, 'active')
      )
    )
    .get()

  if (!result) return null

  // Check expiry
  if (result.apiKey.expiresAt && new Date(result.apiKey.expiresAt) < new Date()) {
    return null
  }

  // Update last used (non-blocking)
  c.executionCtx.waitUntil(
    db.update(apiKeys)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, result.apiKey.id))
  )

  // Populate isEnrolled to match the AuthUser contract used elsewhere.
  let isEnrolled = result.user.role === 'admin' || result.user.role === 'facilitator'
  if (!isEnrolled) {
    const enrollment = await db.select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.userId, result.user.id), ne(enrollments.status, 'dropped')))
      .get()
    if (enrollment) {
      isEnrolled = true
    } else {
      const membership = await db.select({ id: memberships.id })
        .from(memberships)
        .where(and(eq(memberships.userId, result.user.id), eq(memberships.status, 'active')))
        .get()
      if (membership) isEnrolled = true
    }
  }

  return { ...result.user, isEnrolled }
}

/**
 * Resolve the API scope from the API key.
 */
export async function getApiKeyScopes(
  c: Context<AppContext>,
  keyHash: string
): Promise<string> {
  const db = getDb(c.env.DB)
  const key = await db.select({ scopes: apiKeys.scopes })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .get()
  return key?.scopes || 'read'
}
