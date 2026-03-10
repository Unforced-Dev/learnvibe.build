import { Hono } from 'hono'
import { Layout } from '../components/Layout'
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
    <Layout title="Application Received">
      <div class="page-section success-message">
        <h2>Application received</h2>
        <p class="lead">
          Thank you for applying to Cohort 2. We'll review your application and get back to you soon.
        </p>
        <p style="margin-top: 2rem;">
          <a href="/">← Back to homepage</a>
        </p>
      </div>
    </Layout>
  )
})

export default pages
