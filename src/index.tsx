import { Hono } from 'hono'
import type { AppContext } from './types'
import pages from './routes/pages'
import api from './routes/api'
import cohortRoutes from './routes/cohort'

const app = new Hono<AppContext>()

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.route('/', api)

// Redirects from old static URLs to dynamic routes
app.get('/cohort-1.html', (c) => c.redirect('/cohort/cohort-1', 301))
app.get('/cohort-1/week-:num.html', (c) => {
  const num = c.req.param('num')
  return c.redirect(`/cohort/cohort-1/week/${num}`, 301)
})

// Cohort content routes
app.route('/', cohortRoutes)

// JSX page routes (apply form, etc.)
app.route('/', pages)

export default app
