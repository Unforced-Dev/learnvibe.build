import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import type { Context, Next } from 'hono'
import type { AppContext } from '../types'

// Clerk middleware — parses session but does NOT block unauthenticated requests
export const clerkAuth = clerkMiddleware()

// Use on routes that require authentication
export async function requireAuth(c: Context<AppContext>, next: Next) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
}
