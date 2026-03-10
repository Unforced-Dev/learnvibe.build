import type { AuthUser } from './lib/auth'

export type Bindings = {
  DB: D1Database
  CLERK_PUBLISHABLE_KEY: string
  CLERK_SECRET_KEY: string
  CLERK_WEBHOOK_SECRET: string
}

export type Variables = {
  user: AuthUser | null
}

export type AppContext = {
  Bindings: Bindings
  Variables: Variables
}
