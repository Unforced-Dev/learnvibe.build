import { eq, and, ne } from 'drizzle-orm'
import { getDb } from '../db'
import { enrollments, memberships } from '../db/schema'
import type { AuthUser } from './auth'

/**
 * Check if a user has access to community features.
 * Requires: authenticated + at least one non-dropped enrollment OR active membership OR admin/facilitator.
 */
export async function hasCommunityAccess(
  db: D1Database,
  user: AuthUser | null
): Promise<boolean> {
  if (!user) return false
  if (user.role === 'admin' || user.role === 'facilitator') return true

  const database = getDb(db)

  // Check any active enrollment
  const enrollment = await database
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, user.id),
        ne(enrollments.status, 'dropped')
      )
    )
    .get()

  if (enrollment) return true

  // Check active membership
  const membership = await database
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, user.id),
        eq(memberships.status, 'active')
      )
    )
    .get()

  if (membership) return true

  return false
}

/**
 * Check if a user has access to a gated cohort.
 * Access is granted if the user:
 * 1. Is an admin or facilitator
 * 2. Is enrolled in the cohort
 * 3. Has an active membership (alumni get continued access)
 */
export async function canAccessCohort(
  db: D1Database,
  user: AuthUser | null,
  cohortId: number,
  isPublic: number
): Promise<boolean> {
  // Public cohorts are accessible to everyone
  if (isPublic) return true

  // Not logged in — no access
  if (!user) return false

  // Admins and facilitators can see everything
  if (user.role === 'admin' || user.role === 'facilitator') return true

  const database = getDb(db)

  // Check enrollment
  const enrollment = await database
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, user.id),
        eq(enrollments.cohortId, cohortId)
      )
    )
    .get()

  if (enrollment && enrollment.status !== 'dropped') return true

  // Check active membership (alumni can access all content)
  const membership = await database
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, user.id),
        eq(memberships.status, 'active')
      )
    )
    .get()

  if (membership) return true

  return false
}
