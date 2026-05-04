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

// ===== /interest — public form =====
// Email-only by design. We used to collect name + a 4-checkbox interest
// segmentation, but the friction wasn't pulling its weight. The schema
// keeps `name` and `interests_json` columns nullable / default-empty so
// future segmentation can come back without a migration.
interest.get('/interest', (c) => {
  const user = c.get('user')
  const error = c.req.query('error')
  const errorMessages: Record<string, string> = {
    missing_email: 'An email is required.',
    invalid_email: 'That email doesn\'t look right — give it another go.',
    server_error: 'Something went wrong on our end. Please try again.',
  }
  return c.html(
    <Layout
      title="Join the interest list — Learn Vibe Build"
      description="Drop your email to hear about Cohort 2 and what's next."
      user={user}
    >
      <div class="page-section" style="max-width: 520px; margin: 0 auto;">
        <a href="/" style="font-size: 0.85rem; color: var(--text-tertiary); text-decoration: none;">&larr; Home</a>

        <p class="section-label" style="margin-top: 1.5rem;">Interest list</p>
        <h2>Stay in the loop</h2>
        <p class="lead">
          Cohort 1 is in flight; Cohort 2 is forming. Drop your email and we'll be in touch — thoughtful and infrequent.
        </p>

        {error && errorMessages[error] && (
          <div class="form-error" style="margin-top: 1rem;">{errorMessages[error]}</div>
        )}

        <form method="post" action="/api/interests" style="margin-top: 1.5rem; display: flex; gap: 0.5rem; align-items: stretch; flex-wrap: wrap;">
          <input
            type="email"
            id="email"
            name="email"
            required
            autocomplete="email"
            placeholder="you@example.com"
            style="flex: 1; min-width: 220px; padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 8px; font-size: 1rem; font-family: inherit;"
          />
          <button type="submit" class="apply-btn" style="margin: 0; padding: 0.75rem 1.5rem; white-space: nowrap;">Join the list</button>
        </form>
      </div>
    </Layout>
  )
})

// ===== POST /api/interests — submit form =====
interest.post('/api/interests', async (c) => {
  const db = getDb(c.env.DB)
  const body = await c.req.parseBody()

  const email = String(body.email || '').trim().toLowerCase()
  // `name` field is no longer in the public form. We still accept it on
  // POST in case a future surface (admin-side, API, etc.) wants to pass
  // one — but we don't require or expose it. Defaults null otherwise.
  const name = String(body.name || '').trim() || null
  const referer = c.req.header('Referer') || ''
  const sourcePath = (() => {
    try { return new URL(referer).pathname || null } catch { return null }
  })()

  if (!email) return c.redirect('/interest?error=missing_email')
  if (!email.includes('@') || email.length > 254) return c.redirect('/interest?error=invalid_email')

  // Skip the confirmation email on re-submits — preserves all signal in
  // the DB (when they came back) without re-mailing them.
  const existing = await db.select().from(interests).where(eq(interests.email, email)).get()

  // Best-effort audience sync. Fails silently; admin can resync via the
  // resend_contact_id column on /admin/interests.
  const audienceId = c.env.RESEND_AUDIENCE_INTEREST || ''
  const audienceResult = audienceId
    ? await addToAudience(c.env, email, name, audienceId)
    : { contactId: null }

  try {
    await db.insert(interests).values({
      email,
      name,
      sourcePath,
      // interests_json defaults to '[]'; we no longer collect tags via the
      // public form. Schema unchanged so old rows keep their data.
      interestsJson: '[]',
      resendContactId: audienceResult.contactId,
    })
  } catch (e) {
    console.error('[interests] insert failed:', e)
    return c.redirect('/interest?error=server_error')
  }

  if (!existing && isEmailConfigured(c.env.RESEND_API_KEY)) {
    try {
      const tpl = await renderEmailTemplate(c.env.DB, 'interest_received', {})
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
      // Don't fail the user-facing flow — admin can resend manually
      // from /admin/emails.
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

export default interest
