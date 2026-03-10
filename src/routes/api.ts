import { Hono } from 'hono'
import { applications } from '../db/schema'
import { getDb } from '../db'
import type { AppContext } from '../types'

const api = new Hono<AppContext>()

api.post('/api/applications', async (c) => {
  const body = await c.req.parseBody()

  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim()
  const background = String(body.background || '').trim()
  const projectInterest = String(body.project_interest || '').trim()
  const referralSource = String(body.referral_source || '').trim()
  const pricingTier = String(body.pricing_tier || '').trim()

  const validTiers = ['full', 'alumni', 'regenhub_member', 'core_member']

  // Validate required fields
  if (!name || !email || !background || !projectInterest || !referralSource || !pricingTier) {
    return c.redirect('/apply?error=missing_fields')
  }

  if (!validTiers.includes(pricingTier)) {
    return c.redirect('/apply?error=invalid_tier')
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
      pricingTier,
    })

    return c.redirect('/apply/success')
  } catch (error) {
    console.error('Failed to save application:', error)
    return c.redirect('/apply?error=server_error')
  }
})

export default api
