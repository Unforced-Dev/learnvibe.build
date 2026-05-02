import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { Layout } from '../components/Layout'
import { getDb } from '../db'
import { interests } from '../db/schema'
import { sendEmail, isEmailConfigured } from '../lib/email'
import { renderEmailTemplate } from '../lib/email-templates'
import { addToAudience } from '../lib/resend-audience'
import type { AppContext } from '../types'

const interest = new Hono<AppContext>()

// ===== INTEREST CHECKBOX OPTIONS =====
// Source of truth for the four signup buckets. Changing labels here
// updates the form, the success page, and the admin list view.
const INTEREST_OPTIONS: { value: string; label: string; description: string }[] = [
  {
    value: 'next_cohort',
    label: 'Next cohort',
    description: 'Updates as Cohort 2 takes shape — dates, application opening, anything material.',
  },
  {
    value: 'alumni',
    label: 'Alumni community',
    description: 'For Cohort 0 and Cohort 1 builders — ongoing community, project shares, future gatherings.',
  },
  {
    value: 'cu_class',
    label: 'CU Boulder class (Fall 2026)',
    description: 'ATLS 4519 — Aaron is teaching a semester-long version of this work at CU Boulder ATLAS.',
  },
  {
    value: 'events',
    label: 'Vibecoding events',
    description: 'One-off events at Regen Hub and around Boulder — workshops, demos, gatherings.',
  },
]

const VALID_INTEREST_VALUES = new Set(INTEREST_OPTIONS.map(o => o.value))

function summarizeInterests(values: string[]): string {
  const labels = values
    .map(v => INTEREST_OPTIONS.find(o => o.value === v)?.label)
    .filter(Boolean) as string[]
  if (labels.length === 0) return 'the general updates list'
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

// ===== /interest — public form =====
interest.get('/interest', (c) => {
  const user = c.get('user')
  const error = c.req.query('error')
  const errorMessages: Record<string, string> = {
    missing_email: 'An email is required.',
    invalid_email: 'That email doesn\'t look right — give it another go.',
    no_interests: 'Pick at least one thing you\'re interested in.',
    server_error: 'Something went wrong on our end. Please try again.',
  }
  return c.html(
    <Layout
      title="Join the interest list — Learn Vibe Build"
      description="Drop your email to hear about Cohort 2, alumni community, the CU Boulder class, and vibecoding events."
      user={user}
    >
      <div class="page-section" style="max-width: 640px; margin: 0 auto;">
        <a href="/" style="font-size: 0.85rem; color: var(--text-tertiary); text-decoration: none;">&larr; Home</a>

        <p class="section-label" style="margin-top: 1.5rem;">Interest list</p>
        <h2>Stay in the loop</h2>
        <p class="lead">
          Cohort 1 is in flight; Cohort 2 is forming. Drop your email and pick what you'd like to hear about. We'll keep these messages thoughtful and infrequent.
        </p>

        {error && errorMessages[error] && (
          <div class="form-error" style="margin-top: 1rem;">{errorMessages[error]}</div>
        )}

        <form method="post" action="/api/interests" class="apply-form" style="margin-top: 1.5rem;">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required autocomplete="email" />
          </div>

          <div class="form-group">
            <label for="name">Your name <span style="color: var(--text-tertiary); font-weight: 400;">(optional)</span></label>
            <input type="text" id="name" name="name" autocomplete="name" />
          </div>

          <div class="form-group" style="margin-top: 1.5rem;">
            <p style="font-weight: 600; font-size: 1rem; margin-bottom: 0.4rem;">What would you like to hear about?</p>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.85rem;">Pick any combination — you can update later.</p>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              {INTEREST_OPTIONS.map(opt => (
                <label style="display: flex; gap: 0.6rem; align-items: flex-start; padding: 0.7rem 0.85rem; border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">
                  <input
                    type="checkbox"
                    name="interests"
                    value={opt.value}
                    checked={opt.value === 'next_cohort'}
                    style="margin-top: 0.25rem;"
                  />
                  <span>
                    <strong style="display: block;">{opt.label}</strong>
                    <span style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.15rem; line-height: 1.45;">{opt.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" class="apply-btn" style="margin-top: 1.5rem;">Join the list</button>
        </form>
      </div>
    </Layout>
  )
})

// ===== POST /api/interests — submit form =====
interest.post('/api/interests', async (c) => {
  const db = getDb(c.env.DB)
  const body = await c.req.parseBody({ all: true })

  const email = String(body.email || '').trim().toLowerCase()
  const name = String(body.name || '').trim() || null
  // Hono's `parseBody({ all: true })` returns a single value when the
  // checkbox group has 1 selection and an array when there are 2+. Coerce
  // to array uniformly.
  const rawInterests = body.interests
  const selectedInterests: string[] = Array.isArray(rawInterests)
    ? rawInterests.map(String)
    : rawInterests
      ? [String(rawInterests)]
      : []
  const validInterests = selectedInterests.filter(v => VALID_INTEREST_VALUES.has(v))
  const referer = c.req.header('Referer') || ''
  const sourcePath = (() => {
    try { return new URL(referer).pathname || null } catch { return null }
  })()

  if (!email) return c.redirect('/interest?error=missing_email')
  if (!email.includes('@') || email.length > 254) return c.redirect('/interest?error=invalid_email')
  if (validInterests.length === 0) return c.redirect('/interest?error=no_interests')

  // Check for an existing row so we can skip the confirmation email on
  // re-submits. Insert is unconditional — the table has no UNIQUE on
  // email, so re-signups land as new rows (preserves all signal: when
  // they came back, what changed in their interests).
  const existing = await db.select().from(interests).where(eq(interests.email, email)).get()

  // Best-effort audience sync. Don't block the user on Resend latency or
  // failures; the DB row is the source of truth. The audience id is plumbed
  // through env config — set RESEND_AUDIENCE_INTEREST in wrangler.toml to
  // the audience id created in the Resend dashboard. When unset, the row
  // is still recorded with resend_contact_id=null and admin can resync
  // later.
  const firstName = name?.split(' ')[0]
  const audienceId = c.env.RESEND_AUDIENCE_INTEREST || ''
  const audienceResult = audienceId
    ? await addToAudience(c.env, email, name, audienceId)
    : { contactId: null }

  try {
    await db.insert(interests).values({
      email,
      name,
      sourcePath,
      interestsJson: JSON.stringify(validInterests),
      resendContactId: audienceResult.contactId,
    })
  } catch (e) {
    console.error('[interests] insert failed:', e)
    return c.redirect('/interest?error=server_error')
  }

  // Send the confirmation email only on first signup. Repeats get a quiet
  // "your interests have been updated" experience without re-mailing them.
  if (!existing && isEmailConfigured(c.env.RESEND_API_KEY)) {
    const interestSummary = summarizeInterests(validInterests)
    try {
      const tpl = await renderEmailTemplate(c.env.DB, 'interest_received', {
        firstName: firstName || 'there',
        interestSummary,
      })
      await sendEmail({
        apiKey: c.env.RESEND_API_KEY,
        from: c.env.EMAIL_FROM,
        replyTo: c.env.EMAIL_REPLY_TO,
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        db: c.env.DB,
        template: 'interest_received',
      })
    } catch (e) {
      console.error('[interests] confirmation email failed:', e)
      // Don't fail the user-facing flow on email-send error — the signup
      // is recorded, admin can resend manually from /admin/emails.
    }
  }

  return c.redirect('/interest/success')
})

// ===== /interest/success =====
interest.get('/interest/success', (c) => {
  return c.html(
    <Layout title="On the list — Learn Vibe Build" user={c.get('user')}>
      <div class="page-section success-message" style="max-width: 600px; margin: 0 auto;">
        <h2>You're on the list</h2>
        <p class="lead">
          We'll be in touch as Cohort 2 takes shape. In the meantime, feel free to <a href="mailto:ag@unforced.dev" style="color: var(--accent);">reply with whatever's alive in you</a> around AI right now — questions, ideas, things you're trying to make.
        </p>
        <p style="margin-top: 2rem;">
          <a href="/">← Back to homepage</a>
        </p>
      </div>
    </Layout>
  )
})

export { INTEREST_OPTIONS }
export default interest
