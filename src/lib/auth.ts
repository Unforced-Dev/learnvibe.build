import { Context } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { eq, and, ne, isNull, sql } from 'drizzle-orm'
import { getDb } from '../db'
import { users, enrollments, memberships, interests } from '../db/schema'
import type { AppContext } from '../types'

export type AuthUser = {
  id: number
  clerkId: string
  email: string
  name: string | null
  role: string
  isEnrolled: boolean
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

    if (!user) return null

    // Check enrollment status for nav display
    let isEnrolled = false
    if (user.role === 'admin' || user.role === 'facilitator') {
      isEnrolled = true
    } else {
      const enrollment = await db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, user.id),
            ne(enrollments.status, 'dropped')
          )
        )
        .get()

      if (enrollment) {
        isEnrolled = true
      } else {
        const membership = await db
          .select()
          .from(memberships)
          .where(
            and(
              eq(memberships.userId, user.id),
              eq(memberships.status, 'active')
            )
          )
          .get()

        if (membership) isEnrolled = true
      }
    }

    return { ...user, isEnrolled }
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
    return { ...existing, isEnrolled: false }
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

  const newUser = result[0]

  // If this user has any approved sponsored applications waiting,
  // enroll them now and send the welcome email. Also links userId on
  // any other approved (paid) applications so Stripe can find them.
  // Loaded lazily to avoid a circular import (enrollment ↔ email).
  try {
    const { autoEnrollOnSignup } = await import('./enrollment')
    await autoEnrollOnSignup(db, c.env, { id: newUser.id, email: newUser.email })
  } catch (e) {
    // Non-fatal — log and continue. The Clerk webhook also fires this.
    console.error('autoEnrollOnSignup failed (non-fatal):', e)
  }

  // Best-effort: link any unlinked interests row matching this email to
  // the new user. Treats interest-list signup as the first step of the
  // funnel (interest → signup → application → enrollment) — see #44.
  // Failure is non-fatal; admin can resync via direct D1 update.
  try {
    await db
      .update(interests)
      .set({ userId: newUser.id })
      .where(and(
        eq(sql<string>`LOWER(${interests.email})`, newUser.email.toLowerCase()),
        isNull(interests.userId),
      ))
  } catch (e) {
    console.error('interests-link on signup failed (non-fatal):', e)
  }

  return { ...newUser, isEnrolled: false }
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

/**
 * Constant-time string compare. Prevents timing attacks when comparing
 * secrets/tokens (e.g. application payment tokens).
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * Generate a URL-safe random token (32 hex chars = 128 bits).
 */
export function generateToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}
