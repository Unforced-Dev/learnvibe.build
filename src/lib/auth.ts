import { Context } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import { users } from '../db/schema'
import type { AppContext } from '../types'

export type AuthUser = {
  id: number
  clerkId: string
  email: string
  name: string | null
  role: string
}

/**
 * Get the authenticated user from the request context.
 * Returns null if not authenticated or Clerk is not configured.
 */
export async function getUser(c: Context<AppContext>): Promise<AuthUser | null> {
  try {
    const auth = getAuth(c)
    if (!auth?.userId) return null

    const db = getDb(c.env.DB)
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, auth.userId))
      .get()

    return user || null
  } catch {
    // Clerk not configured or error — return null
    return null
  }
}

/**
 * Sync a Clerk user to the D1 users table.
 * Creates the user if they don't exist, updates if they do.
 */
export async function syncUser(
  c: Context<AppContext>,
  clerkId: string,
  email: string,
  name?: string | null
): Promise<AuthUser> {
  const db = getDb(c.env.DB)

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .get()

  if (existing) {
    // Update email/name if changed
    if (existing.email !== email || existing.name !== (name || null)) {
      await db
        .update(users)
        .set({ email, name: name || null })
        .where(eq(users.clerkId, clerkId))
    }
    return existing
  }

  // Create new user
  const result = await db
    .insert(users)
    .values({
      clerkId,
      email,
      name: name || null,
      role: 'student',
    })
    .returning()

  return result[0]
}

/**
 * Check if a user has admin/facilitator privileges.
 */
export function isAdmin(user: AuthUser | null): boolean {
  if (!user) return false
  return user.role === 'admin' || user.role === 'facilitator'
}

/**
 * Check if Clerk is properly configured (not using placeholder keys).
 */
export function isClerkConfigured(c: Context<AppContext>): boolean {
  const pubKey = c.env.CLERK_PUBLISHABLE_KEY
  const secKey = c.env.CLERK_SECRET_KEY
  return !!(pubKey && secKey && !pubKey.includes('placeholder') && !secKey.includes('placeholder'))
}
