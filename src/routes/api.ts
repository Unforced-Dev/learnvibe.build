import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { applications, lessons } from '../db/schema'
import { getDb } from '../db'
import { isAdmin } from '../lib/auth'
import { sendApplicationReceived, sendApplicationApproved, sendApplicationRejected } from '../lib/email'
import { formatCents, getAmountForTier, getTierLabel } from '../lib/stripe'
import type { AppContext } from '../types'

const api = new Hono<AppContext>()

// ===== PUBLIC: Application submission =====
api.post('/api/applications', async (c) => {
  const body = await c.req.parseBody()

  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim()
  const background = String(body.background || '').trim()
  const projectInterest = String(body.project_interest || '').trim()
  const referralSource = String(body.referral_source || '').trim()

  // Validate required fields
  if (!name || !email || !background || !projectInterest || !referralSource) {
    return c.redirect('/apply?error=missing_fields')
  }

  if (!email.includes('@') || !email.includes('.')) {
    return c.redirect('/apply?error=invalid_email')
  }

  try {
    const db = getDb(c.env.DB)
    await db.insert(applications).values({
      name,
      email,
      background,
      projectInterest,
      referralSource,
      pricingTier: 'pending',
    })

    // Send confirmation email (non-blocking — don't fail the request if email fails)
    c.executionCtx.waitUntil(
      sendApplicationReceived(c.env, email, name)
    )

    return c.redirect('/apply/success')
  } catch (error) {
    console.error('Failed to save application:', error)
    return c.redirect('/apply?error=server_error')
  }
})

// ===== ADMIN: Update application status =====
api.post('/api/admin/applications/:id/status', async (c) => {
  const user = c.get('user')
  if (!isAdmin(user)) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.parseBody()
  const action = String(body.action || '')
  const pricingTier = String(body.pricing_tier || 'standard')
  const notes = String(body.notes || '').trim()

  if (!['approve', 'reject'].includes(action)) {
    return c.redirect(`/admin/applications/${id}?error=invalid_action`)
  }

  try {
    const db = getDb(c.env.DB)
    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // Get the application first so we can email the applicant
    const app = await db.select().from(applications).where(eq(applications.id, id)).get()
    if (!app) {
      return c.redirect(`/admin/applications/${id}?error=not_found`)
    }

    await db.update(applications)
      .set({
        status: newStatus,
        pricingTier: action === 'approve' ? pricingTier : 'pending',
        notes: notes || null,
        approvedAt: action === 'approve' ? new Date().toISOString() : null,
      })
      .where(eq(applications.id, id))

    // Send email notification (non-blocking)
    const baseUrl = new URL(c.req.url).origin
    if (action === 'approve') {
      const amountCents = getAmountForTier(pricingTier)
      const paymentUrl = `${baseUrl}/payment/checkout/${id}`
      c.executionCtx.waitUntil(
        sendApplicationApproved(
          c.env,
          app.email,
          app.name,
          paymentUrl,
          getTierLabel(pricingTier),
          formatCents(amountCents),
          amountCents === 0
        )
      )
    } else {
      c.executionCtx.waitUntil(
        sendApplicationRejected(c.env, app.email, app.name)
      )
    }

    return c.redirect(`/admin/applications/${id}`)
  } catch (error) {
    console.error('Failed to update application:', error)
    return c.redirect(`/admin/applications/${id}?error=server_error`)
  }
})

// ===== ADMIN: Create lesson =====
api.post('/api/admin/lessons', async (c) => {
  const user = c.get('user')
  if (!isAdmin(user)) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const body = await c.req.parseBody()
  const cohortId = parseInt(String(body.cohort_id || '0'), 10)
  const weekNumber = parseInt(String(body.week_number || '0'), 10)
  const title = String(body.title || '').trim()
  const description = String(body.description || '').trim()
  const date = String(body.date || '').trim()
  const contentMarkdown = String(body.content_markdown || '')
  const status = String(body.status || 'draft')

  if (!cohortId || !weekNumber || !title) {
    return c.redirect('/admin/lessons/new?error=missing_fields')
  }

  try {
    const db = getDb(c.env.DB)
    const result = await db.insert(lessons).values({
      cohortId,
      weekNumber,
      title,
      description: description || null,
      date: date || null,
      contentMarkdown,
      status,
      sortOrder: weekNumber,
    }).returning()

    return c.redirect(`/admin/lessons/${result[0].id}/edit`)
  } catch (error) {
    console.error('Failed to create lesson:', error)
    return c.redirect('/admin/lessons/new?error=server_error')
  }
})

// ===== ADMIN: Update lesson =====
api.post('/api/admin/lessons/:id', async (c) => {
  const user = c.get('user')
  if (!isAdmin(user)) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.parseBody()
  const cohortId = parseInt(String(body.cohort_id || '0'), 10)
  const weekNumber = parseInt(String(body.week_number || '0'), 10)
  const title = String(body.title || '').trim()
  const description = String(body.description || '').trim()
  const date = String(body.date || '').trim()
  const contentMarkdown = String(body.content_markdown || '')
  const status = String(body.status || 'draft')

  if (!cohortId || !weekNumber || !title) {
    return c.redirect(`/admin/lessons/${id}/edit?error=missing_fields`)
  }

  try {
    const db = getDb(c.env.DB)
    await db.update(lessons)
      .set({
        cohortId,
        weekNumber,
        title,
        description: description || null,
        date: date || null,
        contentMarkdown,
        status,
        sortOrder: weekNumber,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(lessons.id, id))

    return c.redirect(`/admin/lessons/${id}/edit?saved=true`)
  } catch (error) {
    console.error('Failed to update lesson:', error)
    return c.redirect(`/admin/lessons/${id}/edit?error=server_error`)
  }
})

export default api
