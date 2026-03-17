import type { AuthUser } from './lib/auth'

export type Bindings = {
  DB: D1Database
  CLERK_PUBLISHABLE_KEY: string
  CLERK_SECRET_KEY: string
  CLERK_WEBHOOK_SECRET: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  RESEND_API_KEY: string
  EMAIL_FROM: string // e.g. "Learn Vibe Build <hello@learnvibe.build>"
}

export type Variables = {
  user: AuthUser | null
}

export type AppContext = {
  Bindings: Bindings
  Variables: Variables
}
