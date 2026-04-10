import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import type { Context, Next } from 'hono'
import type { AppContext } from '../types'
import { getUser, isClerkConfigured } from '../lib/auth'

/**
 * Clerk session middleware — parses auth token but does NOT block unauthenticated requests.
 * Also populates c.set('user', ...) with the DB user record.
 */
export async function authMiddleware(c: Context<AppContext>, next: Next) {
  // Default to null
  c.set('user', null)

  if (!isClerkConfigured(c)) {
    await next()
    return
  }

  // Run Clerk's middleware to parse the session
  const clerkMw = clerkMiddleware()
  await clerkMw(c, async () => {
    // After Clerk parses, look up the user in our DB
    const user = await getUser(c)
    c.set('user', user)
    await next()
  })
}

/**
 * Use on routes that require authentication.
 * For HTML routes, redirects to sign-in page.
 * For API routes, returns 401 JSON.
 */
export async function requireAuth(c: Context<AppContext>, next: Next) {
  const user = c.get('user')
  if (!user) {
    const accept = c.req.header('Accept') || ''
    if (accept.includes('text/html')) {
      const url = new URL(c.req.url)
      const returnUrl = encodeURIComponent(url.pathname + url.search)
      return c.redirect(`/sign-in?redirect_url=${returnUrl}`)
    }
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
}

/**
 * Use on routes that require admin/facilitator role.
 */
export async function requireAdmin(c: Context<AppContext>, next: Next) {
  const user = c.get('user')
  if (!user) {
    const accept = c.req.header('Accept') || ''
    if (accept.includes('text/html')) {
      const url = new URL(c.req.url)
      const returnUrl = encodeURIComponent(url.pathname + url.search)
      return c.redirect(`/sign-in?redirect_url=${returnUrl}`)
    }
    return c.json({ error: 'Unauthorized' }, 401)
  }
  if (user.role !== 'admin' && user.role !== 'facilitator') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await next()
}
