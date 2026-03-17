import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { Layout } from '../components/Layout'
import { getDb } from '../db'
import { applications } from '../db/schema'
import { formatCents, getAmountForTier, getTierLabel } from '../lib/stripe'
import type { AppContext } from '../types'

const pages = new Hono<AppContext>()

pages.get('/apply', (c) => {
  const error = c.req.query('error')

  const errorMessages: Record<string, string> = {
    missing_fields: 'Please fill out all required fields.',
    invalid_email: 'Please enter a valid email address.',
    server_error: 'Something went wrong. Please try again.',
  }

  return c.html(
    <Layout
      title="Apply for Cohort 2"
      description="Apply for Learn Vibe Build Cohort 2 — 6 weeks of building with AI as your creative partner."
      user={c.get('user')}
    >
      <div class="page-section">
        <p class="section-label">Apply</p>
        <h2>Apply for Cohort 2</h2>
        <p class="lead">
          6 weeks of building with AI as your creative partner. Starting April 2026 in Boulder, CO &amp; remote. $500.
        </p>

        {error && errorMessages[error] && (
          <div class="form-error">
            {errorMessages[error]}
          </div>
        )}

        <form method="post" action="/api/applications" class="apply-form">
          <div class="form-group">
            <label for="name">Full name</label>
            <input type="text" id="name" name="name" required autocomplete="name" />
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required autocomplete="email" />
          </div>

          <div class="form-group">
            <label for="background">Tell us about yourself</label>
            <textarea
              id="background"
              name="background"
              rows={5}
              required
              placeholder="What do you do? What are you interested in? What's your relationship with technology?"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="project_interest">What do you want to build?</label>
            <textarea
              id="project_interest"
              name="project_interest"
              rows={5}
              required
              placeholder="An idea, a project, a tool — whatever excites you. No wrong answers."
            ></textarea>
          </div>

          <div class="form-group">
            <label for="referral_source">How did you hear about Learn Vibe Build?</label>
            <input type="text" id="referral_source" name="referral_source" required />
          </div>

          <button type="submit" class="apply-btn">Submit Application</button>
        </form>
      </div>
    </Layout>
  )
})

pages.get('/apply/success', (c) => {
  return c.html(
    <Layout title="Application Received" user={c.get('user')}>
      <div class="page-section success-message">
        <h2>Application received</h2>
        <p class="lead">
          Thank you for applying to Cohort 2. We'll review your application and get back to you soon.
        </p>
        <p style="margin-top: 1.5rem; color: var(--text-secondary);">
          You can check your application status anytime at <a href="/apply/status" style="color: var(--accent);">/apply/status</a>
        </p>
        <p style="margin-top: 2rem;">
          <a href="/">← Back to homepage</a>
        </p>
      </div>
    </Layout>
  )
})

// ===== APPLICATION STATUS CHECK =====
// Applicants enter their email to check application status and get payment link
pages.get('/apply/status', (c) => {
  return c.html(
    <Layout title="Check Application Status" user={c.get('user')}>
      <div class="page-section" style="max-width: 500px; margin: 0 auto;">
        <p class="section-label">Application Status</p>
        <h2>Check Your Status</h2>
        <p class="lead" style="margin-top: 0.5rem;">
          Enter the email you applied with to check your application status.
        </p>

        <form method="post" action="/apply/status" class="apply-form" style="margin-top: 2rem;">
          <div class="form-group">
            <label for="email">Email address</label>
            <input type="email" id="email" name="email" required autocomplete="email" placeholder="you@example.com" />
          </div>
          <button type="submit" class="apply-btn">Check Status</button>
        </form>
      </div>
    </Layout>
  )
})

pages.post('/apply/status', async (c) => {
  const user = c.get('user')
  const body = await c.req.parseBody()
  const email = String(body.email || '').trim().toLowerCase()

  if (!email) {
    return c.redirect('/apply/status')
  }

  const db = getDb(c.env.DB)
  const app = await db.select().from(applications)
    .where(eq(applications.email, email))
    .get()

  if (!app) {
    return c.html(
      <Layout title="Application Status" user={user}>
        <div class="page-section" style="max-width: 500px; margin: 0 auto; text-align: center; padding: 4rem 0;">
          <h2>No Application Found</h2>
          <p style="margin-top: 1rem; color: var(--text-secondary);">
            We couldn't find an application for <strong>{email}</strong>.
          </p>
          <p style="margin-top: 1.5rem;">
            <a href="/apply" style="color: var(--accent); font-weight: 500;">Apply for Cohort 2 →</a>
          </p>
          <p style="margin-top: 1rem;">
            <a href="/apply/status" style="color: var(--text-tertiary);">← Try another email</a>
          </p>
        </div>
      </Layout>
    )
  }

  const amountCents = getAmountForTier(app.pricingTier)

  return c.html(
    <Layout title="Application Status" user={user}>
      <div class="page-section" style="max-width: 600px; margin: 0 auto;">
        <p class="section-label">Application Status</p>
        <h2>Hi {app.name.split(' ')[0]}</h2>

        <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 10px; background: var(--surface);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-tertiary);">
              Applied {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span class={`badge badge-${app.status === 'approved' ? 'active' : (app.status as any) === 'enrolled' ? 'active' : app.status === 'rejected' ? 'completed' : 'pending'}`} style="font-size: 0.85rem;">
              {(app.status as any) === 'enrolled' ? 'enrolled' : app.status}
            </span>
          </div>

          {app.status === 'pending' && (
            <div>
              <p style="color: var(--text-secondary); line-height: 1.6;">
                Your application is under review. We'll be in touch soon — typically within a few days.
              </p>
            </div>
          )}

          {app.status === 'approved' && (
            <div>
              <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem;">
                Great news — your application has been approved!
                {amountCents > 0
                  ? ` Complete your payment of ${formatCents(amountCents)} (${getTierLabel(app.pricingTier)}) to secure your spot.`
                  : ` Your spot has been sponsored — create your account to get started.`}
              </p>
              <a href={`/payment/checkout/${app.id}`} style="display: inline-block; background: var(--accent); color: white; padding: 0.85rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1.05rem;">
                {amountCents > 0 ? `Pay ${formatCents(amountCents)} & Enroll →` : 'Complete Enrollment →'}
              </a>
            </div>
          )}

          {(app.status as any) === 'enrolled' && (
            <div>
              <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.5rem;">
                You're enrolled! Create your account (or sign in) to access your cohort content.
              </p>
              <a href="/sign-in" style="display: inline-block; background: var(--accent); color: white; padding: 0.85rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Sign In →
              </a>
            </div>
          )}

          {app.status === 'rejected' && (
            <div>
              <p style="color: var(--text-secondary); line-height: 1.6;">
                Thank you for your interest. Unfortunately, we weren't able to offer you a spot in this cohort.
                Feel free to apply again for a future cohort.
              </p>
            </div>
          )}
        </div>

        <p style="margin-top: 2rem; text-align: center;">
          <a href="/" style="color: var(--text-tertiary);">← Back to Home</a>
        </p>
      </div>
    </Layout>
  )
})

export default pages
