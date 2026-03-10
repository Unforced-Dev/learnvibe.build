import { Hono } from 'hono'
import { Layout } from '../components/Layout'
import type { AppContext } from '../types'

const pages = new Hono<AppContext>()

pages.get('/apply', (c) => {
  const error = c.req.query('error')

  const errorMessages: Record<string, string> = {
    missing_fields: 'Please fill out all required fields.',
    invalid_tier: 'Please select a valid pricing tier.',
    invalid_email: 'Please enter a valid email address.',
    server_error: 'Something went wrong. Please try again.',
  }

  return c.html(
    <Layout
      title="Apply for Cohort 2"
      description="Apply for Learn Vibe Build Cohort 2 — 6 weeks of building with AI as your creative partner."
    >
      <section>
        <p class="section-mark">Apply</p>
        <h2>Apply for Cohort 2</h2>
        <p class="lead">
          6 weeks of building with AI as your creative partner. Starting early April 2026 in Boulder, Colorado.
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

          <div class="form-group">
            <label for="pricing_tier">Pricing tier</label>
            <select id="pricing_tier" name="pricing_tier" required>
              <option value="">Select your tier...</option>
              <option value="full">General admission — $500</option>
              <option value="alumni">Cohort 1 alumni — $250</option>
              <option value="regenhub_member">RegenHub co-working member — $250</option>
              <option value="core_member">RegenHub core member — Free</option>
            </select>
          </div>

          <button type="submit" class="apply-btn">Submit Application</button>
        </form>
      </section>
    </Layout>
  )
})

pages.get('/apply/success', (c) => {
  return c.html(
    <Layout title="Application Received">
      <section class="success-message">
        <h2>Application received</h2>
        <p class="lead" style="max-width: 500px; margin: 2rem auto;">
          Thank you for applying to Cohort 2. We'll review your application and get back to you soon.
        </p>
        <p style="margin-top: 3rem;">
          <a href="/">Back to homepage</a>
        </p>
      </section>
    </Layout>
  )
})

export default pages
