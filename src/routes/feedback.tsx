import { Hono } from 'hono'
import { Layout } from '../components/Layout'
import { getDb } from '../db'
import { feedback } from '../db/schema'
import type { AppContext } from '../types'

const feedbackRoutes = new Hono<AppContext>()

// ===== FEEDBACK FORM =====
feedbackRoutes.get('/feedback', (c) => {
  const user = c.get('user')
  const submitted = c.req.query('submitted')

  if (submitted === 'true') {
    return c.html(
      <Layout title="Thank You" user={user}>
        <div class="page-section success-message">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🙏</div>
          <h2>Thank you for your feedback</h2>
          <p class="lead" style="margin-top: 1rem;">
            Your feedback helps us make Learn Vibe Build better for everyone.
          </p>
          <p style="margin-top: 1.5rem; color: var(--text-secondary);">
            If you shared a testimonial, we may feature it on the site (with your permission).
          </p>
          <p style="margin-top: 2rem;">
            <a href="/">← Back to homepage</a>
          </p>
        </div>
      </Layout>
    )
  }

  const error = c.req.query('error')
  const errorMessages: Record<string, string> = {
    missing_fields: 'Please fill out at least your name, email, and one feedback field.',
    server_error: 'Something went wrong. Please try again.',
  }

  return c.html(
    <Layout
      title="Share Your Feedback"
      description="Tell us about your Learn Vibe Build experience. Your feedback helps us improve and inspires future builders."
      user={user}
    >
      <div class="page-section">
        <p class="section-label">Feedback</p>
        <h2>How was your experience?</h2>
        <p class="lead">
          Your feedback shapes the future of Learn Vibe Build. Tell us what worked, what didn't, and whether we can share your words with future builders.
        </p>

        {error && errorMessages[error] && (
          <div class="form-error">
            {errorMessages[error]}
          </div>
        )}

        <form method="post" action="/api/feedback" class="apply-form">
          <div class="form-group">
            <label for="name">Your name</label>
            <input type="text" id="name" name="name" required autocomplete="name"
              value={user?.name || ''} />
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required autocomplete="email"
              value={user?.email || ''} />
          </div>

          <div class="form-group">
            <label for="cohort">Which cohort were you in?</label>
            <select id="cohort" name="cohort_slug">
              <option value="cohort-0">Pilot Cohort (Cohort 0) — Foundations</option>
              <option value="other">Other / Just attended an event</option>
            </select>
          </div>

          <div class="form-group">
            <label for="rating">Overall rating</label>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
              {[1, 2, 3, 4, 5].map(n => (
                <label key={n} style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer; font-size: 1rem; color: var(--text-secondary);">
                  <input type="radio" name="rating" value={String(n)} style="accent-color: var(--accent);" />
                  {n}
                </label>
              ))}
            </div>
            <span style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.5rem; display: block;">1 = needs work, 5 = amazing</span>
          </div>

          <div class="form-group">
            <label for="highlight">What was the best part?</label>
            <textarea
              id="highlight"
              name="highlight"
              rows={4}
              placeholder="A specific moment, lesson, connection, or realization..."
            ></textarea>
          </div>

          <div class="form-group">
            <label for="testimonial">In a sentence or two, how would you describe LVB to a friend?</label>
            <textarea
              id="testimonial"
              name="testimonial"
              rows={3}
              placeholder="This is the part we might quote (with your permission) — be as honest as you like."
            ></textarea>
          </div>

          <div class="form-group">
            <label for="improvement">What could be better?</label>
            <textarea
              id="improvement"
              name="improvement"
              rows={4}
              placeholder="Anything — content, pacing, format, communication, tools..."
            ></textarea>
          </div>

          <div class="form-group" style="margin-top: 1.5rem;">
            <label style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; text-transform: none; font-family: var(--font-body); font-size: 0.95rem; color: var(--text-secondary); letter-spacing: normal;">
              <input type="checkbox" name="can_feature" value="1" style="accent-color: var(--accent); margin-top: 0.25rem;" />
              <span>It's OK to feature my testimonial on the Learn Vibe Build website (we'll use your first name only)</span>
            </label>
          </div>

          <button type="submit" class="apply-btn">Submit Feedback</button>
        </form>
      </div>
    </Layout>
  )
})

export default feedbackRoutes
