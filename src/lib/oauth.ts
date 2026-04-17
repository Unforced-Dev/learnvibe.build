// OAuth 2.1 helpers: token generation, hashing, PKCE verification.
// We are the Authorization Server; Clerk is the identity provider for
// the human during the consent step. Tokens are opaque + hashed in D1.

import { eq, and } from 'drizzle-orm'
import { getDb } from '../db'
import { oauthTokens, users, enrollments, memberships } from '../db/schema'
import { ne } from 'drizzle-orm'
import type { AuthUser } from './auth'

/** Generate a URL-safe random string suitable for tokens/codes. */
export function generateOpaqueToken(prefix: string, byteLen = 32): string {
  const bytes = new Uint8Array(byteLen)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${prefix}_${hex}`
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

/** PKCE S256 challenge verification. RFC 7636. */
export async function verifyPkceS256(verifier: string, challenge: string): Promise<boolean> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const computed = base64UrlEncode(new Uint8Array(digest))
  // Timing-safe compare
  if (computed.length !== challenge.length) return false
  let result = 0
  for (let i = 0; i < computed.length; i++) {
    result |= computed.charCodeAt(i) ^ challenge.charCodeAt(i)
  }
  return result === 0
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Look up an OAuth access token and return the associated AuthUser, or null. */
export async function authenticateOAuthToken(
  db: ReturnType<typeof getDb>,
  bearerToken: string
): Promise<AuthUser | null> {
  if (!bearerToken.startsWith('lvb-mcp_')) return null

  const tokenHash = await sha256Hex(bearerToken)
  const result = await db
    .select({ token: oauthTokens, user: users })
    .from(oauthTokens)
    .innerJoin(users, eq(oauthTokens.userId, users.id))
    .where(eq(oauthTokens.tokenHash, tokenHash))
    .get()

  if (!result) return null
  if (result.token.revokedAt) return null
  if (new Date(result.token.expiresAt) < new Date()) return null

  // Best-effort lastUsedAt update. Non-blocking to avoid slowing the request.
  db.update(oauthTokens)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(oauthTokens.id, result.token.id))
    .run()
    .catch(() => { /* ignore */ })

  // Compute isEnrolled the same way other auth paths do.
  let isEnrolled = result.user.role === 'admin' || result.user.role === 'facilitator'
  if (!isEnrolled) {
    const enr = await db.select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.userId, result.user.id), ne(enrollments.status, 'dropped')))
      .get()
    if (enr) {
      isEnrolled = true
    } else {
      const m = await db.select({ id: memberships.id })
        .from(memberships)
        .where(and(eq(memberships.userId, result.user.id), eq(memberships.status, 'active')))
        .get()
      if (m) isEnrolled = true
    }
  }

  return {
    id: result.user.id,
    clerkId: result.user.clerkId,
    email: result.user.email,
    name: result.user.name,
    role: result.user.role,
    isEnrolled,
  }
}

/** Validate that a redirect_uri matches one of the client's registered uris. */
export function isRegisteredRedirectUri(registered: string[], candidate: string): boolean {
  // Exact match per OAuth 2.1 spec (no substring/prefix matching).
  return registered.includes(candidate)
}
