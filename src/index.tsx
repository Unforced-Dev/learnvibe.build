import { Hono } from 'hono'
import type { AppContext } from './types'
import pages from './routes/pages'
import api from './routes/api'

const app = new Hono<AppContext>()

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.route('/', api)

// JSX page routes
app.route('/', pages)

export default app
