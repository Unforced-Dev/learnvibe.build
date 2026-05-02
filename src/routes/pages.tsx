import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { Layout } from '../components/Layout'
import { getDb } from '../db'
import { applications, cohorts } from '../db/schema'
import { formatCents, getApplicationAmount, getApplicationLabel } from '../lib/stripe'
import type { AppContext } from '../types'

const pages = new Hono<AppContext>()

// ===== CURRICULUM PAGE =====
pages.get('/curriculum', (c) => {
  const user = c.get('user')

  const weeks = [
    {
      num: 1,
      title: 'Conversation',
      tagline: 'Three conversations — with yourself, with AI, with each other',
      description: 'We start here because everything else flows from how we engage. The first move is three conversations: with yourself (journaling alone), with AI (thinking together), and with each other (real humans, real feedback). Naming intention up front, inviting questions before answers, and producing a short artifact that maps what\'s actually alive in what you\'re trying to make.',
      youll_learn: [
        'How to talk to AI as a creative partner, not a search engine',
        'The three relationships — conversation with self, with AI, with each other',
        'Naming intention, asking for questions before answers, inviting pushback',
        'How to use your felt sense to guide what you make',
      ],
      youll_build: 'A short written artifact (1–2 pages) mapping what\'s alive in you — what you\'re making, where you feel pulled, where you feel stuck. The starter that everything else builds on.',
      tools: 'Claude (web or desktop)',
    },
    {
      num: 2,
      title: 'Context',
      tagline: 'How AI starts to know you',
      description: 'A first chat with AI is meeting a brilliant stranger. The shift this week is from one-shot conversations to *having* an AI that actually knows you. We work with the artifact you made in Week 1 — annotate it, update it with AI, then pair up and read each other\'s contexts back. Hearing your context reflected by another person is the fastest way to know whether it\'s actually doing its job.',
      youll_learn: [
        'What context actually is — tokens, the context window, and "is the juice worth the squeeze?"',
        'The living document — a short written description of you, your work, and how you want to be supported',
        'Where to keep it — Claude Profile Preferences, a Project\'s custom instructions, or a folder Cowork can read',
        'Naming conventions in the wild — AGENTS.md, SOUL.md, CLAUDE.md — same idea, different names',
      ],
      youll_build: 'Your living document, wherever you choose to keep it. Use it for at least three real AI conversations and notice what shifts.',
      tools: 'Claude.ai (Profile Preferences, Projects), Cowork (optional)',
    },
    {
      num: 3,
      title: 'Connectors',
      tagline: 'AI with hands',
      description: 'AI is powerful in conversation. When you connect it to your tools — calendar, notes, drive, whatever you use — it becomes transformative. The living document you started in Week 2 becomes the context that connectors refer to. This week is about giving AI access to your world so it can act in it, not just chat about it.',
      youll_learn: [
        'What MCPs (Model Context Protocol) are, why they matter, and how to think about them',
        'Enabling built-in connectors — web search, Google Drive, Notion, and more',
        'Safely giving AI access to external systems',
        'Projects in Claude — persistent context for ongoing work',
      ],
      youll_build: 'A Claude Project connected to the tools and data most alive for you',
      tools: 'Claude.ai, Connectors / MCPs',
    },
    {
      num: 4,
      title: 'Craft',
      tagline: 'Making what you need',
      description: 'Techne is the Greek word for craft — the knowledge of how to make things. This week, we use AI as a creative partner to make something you need. Could be a website, a habit tracker, a small tool. Code is optional — a deeper cut for those who want it, never required.',
      youll_learn: [
        'Claude as creative partner — collaborative making, iteration, and taste',
        'Starting small: the minimum viable version of what you actually need',
        'Working with artifacts and previewing as you build',
        'For those who want the depth: a peek at writing and shipping real code',
      ],
      youll_build: 'A working prototype of something useful in your life',
      tools: 'Claude.ai, Claude Code (optional)',
    },
    {
      num: 5,
      title: 'Coordination',
      tagline: 'Weaving agents into one assistant',
      description: 'You\'ve got the pieces — conversation, context, connectors, craft. This week, we compose them. Multiple agents, tools, and workflows come together into a single assistant that organizes your life and hides the complexity behind the scenes.',
      youll_learn: [
        'Multi-agent design — letting agents hand off and collaborate',
        'Automations and scheduled workflows',
        'Your personal assistant — setup, architecture, iteration',
        'How to keep a system coherent as it grows',
      ],
      youll_build: 'The foundation of your own personal AI assistant — one that\'s starting to know you',
      tools: 'Claude Code, agent frameworks, your full toolkit',
    },
    {
      num: 6,
      title: 'Community',
      tagline: 'Demo, reflect, and keep going',
      description: 'We gather to share what we\'ve made and what we\'ve noticed. We reflect on how the practice has changed how we think. And we step into what comes next — the ongoing community of practice that doesn\'t end when the cohort does.',
      youll_learn: [
        'How to keep the practice going after the cohort ends',
        'The landscape: where AI is heading and how to stay oriented',
        'The path into the Learn Vibe Build community and ongoing membership',
      ],
      youll_build: 'A demo of what you\'ve made + the relationships that go with you',
      tools: 'Everything you\'ve learned so far',
    },
  ]

  return c.html(
    <Layout
      title="Curriculum — The Six C's"
      description="Six weeks of practice — Conversation, Context, Connectors, Craft, Coordination, Community. A community of practice for building with AI."
      user={user}
    >
      <style dangerouslySetInnerHTML={{ __html: `@media (max-width: 600px) { .curriculum-detail-grid { grid-template-columns: 1fr !important; } }` }} />
      <div class="page-section" style="max-width: 800px; margin: 0 auto;">
        <a href="/" style="font-size: 0.85rem; color: var(--text-tertiary); text-decoration: none;">&larr; Home</a>

        <p class="section-label" style="margin-top: 2rem;">The Six C's</p>
        <h2>A practice, not a tools tour.</h2>
        <p class="lead">
          Six movements of the same practice. We return to the same core moves each week, deepening as we go &mdash; spirals, not stairs. No coding experience needed. Code is available as a deeper cut for those who want it.
        </p>

        <div style="margin-top: 3rem;">
          {weeks.map((week) => (
            <div style="margin-bottom: 2.5rem; padding: 2rem; background: var(--white); border: 1px solid var(--border); border-radius: 12px;">
              <div style="display: flex; align-items: baseline; gap: 1rem; margin-bottom: 0.75rem;">
                <span style="font-family: var(--font-mono); font-size: 0.7rem; font-weight: 500; color: var(--accent); letter-spacing: 0.03em; text-transform: uppercase;">Week {week.num}</span>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-tertiary);">{week.tools}</span>
              </div>
              <h3 style="font-family: var(--font-display); font-weight: 600; font-size: 1.4rem; letter-spacing: -0.02em; margin-bottom: 0.25rem;">{week.title}</h3>
              <p style="font-size: 0.95rem; color: var(--accent); font-weight: 500; margin-bottom: 1rem;">{week.tagline}</p>
              <p style="color: var(--text-secondary); line-height: 1.7; margin-bottom: 1.25rem;">{week.description}</p>

              <div class="curriculum-detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <div>
                  <h4 style="font-family: var(--font-mono); font-size: 0.7rem; font-weight: 500; color: var(--text-tertiary); letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 0.75rem;">What you'll learn</h4>
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    {week.youll_learn.map((item) => (
                      <li style="padding: 0.3rem 0 0.3rem 1.25rem; position: relative; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;">
                        <span style="position: absolute; left: 0; color: var(--accent);">&rarr;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 style="font-family: var(--font-mono); font-size: 0.7rem; font-weight: 500; color: var(--text-tertiary); letter-spacing: 0.03em; text-transform: uppercase; margin-bottom: 0.75rem;">What you'll build</h4>
                  <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; padding: 0.75rem 1rem; background: var(--surface); border-radius: 6px;">{week.youll_build}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style="text-align: center; padding: 3rem 0;">
          <a href="/interest" style="display: inline-flex; align-items: center; gap: 0.5rem; background: var(--accent); color: white; font-size: 1rem; font-weight: 500; padding: 0.875rem 2rem; border-radius: 8px; text-decoration: none;">
            Join the interest list
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
          <p style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-tertiary);">
            Mondays 5:30&ndash;7:30pm MT &middot; 6 weeks &middot; $500 (sliding-scale) &middot; Boulder, CO &amp; Remote
          </p>
          <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-tertiary);">
            Sliding-scale and sponsored spots available &mdash; cost should never be a barrier.
          </p>
        </div>
      </div>
    </Layout>
  )
})

pages.get('/apply', async (c) => {
  const error = c.req.query('error')
  const db = getDb(c.env.DB)

  // Check whether any cohort is currently `enrolling` — if not, render a
  // graceful "applications aren't open" state pointing at the interest
  // list instead of the form. This way the route still serves a useful
  // page when Cohort 1 closes and Cohort 2 isn't ready to take apps yet.
  const enrollingCohort = await db.select().from(cohorts).where(eq(cohorts.status, 'enrolling')).get()

  if (!enrollingCohort) {
    return c.html(
      <Layout
        title="Applications closed for now — Learn Vibe Build"
        description="Applications aren't open right now. Join the interest list to be notified when the next cohort opens."
        user={c.get('user')}
      >
        <div class="page-section" style="max-width: 640px; margin: 0 auto;">
          <p class="section-label">Apply</p>
          <h2>Applications aren't open right now</h2>
          <p class="lead">
            Cohort 1 is finishing up, and Cohort 2 dates aren't set yet. Drop your email on the interest list and we'll be in touch as the next cohort takes shape.
          </p>
          <div style="margin-top: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
            <a href="/interest" style="display: inline-flex; align-items: center; gap: 0.4rem; background: var(--accent); color: white; padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: 500;">
              Join the interest list →
            </a>
            <a href="/" style="color: var(--text-secondary); text-decoration: none; font-size: 0.95rem;">← Back to homepage</a>
          </div>
          <p style="margin-top: 2rem; font-size: 0.9rem; color: var(--text-secondary); padding-top: 1.5rem; border-top: 1px solid var(--border);">
            Already applied? <a href="/apply/status" style="color: var(--accent);">Check your status →</a>
          </p>
        </div>
      </Layout>
    )
  }

  const errorMessages: Record<string, string> = {
    missing_fields: 'Please fill out all required fields.',
    invalid_email: 'Please enter a valid email address.',
    invalid_amount: 'Please enter a contribution between $0 and $500.',
    too_long: 'One or more fields are too long. Please shorten and try again.',
    server_error: 'Something went wrong. Please try again.',
  }

  return c.html(
    <Layout
      title="Apply"
      description="Apply for Learn Vibe Build — 6 weeks of building with AI as your creative partner. Cohort 1 is in flight; Cohort 2 is forming."
      user={c.get('user')}
    >
      <div class="page-section">
        <p class="section-label">Apply</p>
        <h2>Apply for the next cohort</h2>
        <p class="lead">
          6 weeks of building with AI as your creative partner. Mondays 5:30&ndash;7:30pm MT, in Boulder, CO &amp; remote. $500 with a sliding-scale option below &mdash; sponsored spots available too. Cohort 1 is in flight now; Cohort 2 dates land soon. We&rsquo;ll be in touch.
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

          <div class="form-group" style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
            <p style="font-weight: 600; font-size: 1rem; margin-bottom: 0.5rem;">Financial</p>
            <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin-bottom: 1rem;">
              The cohort is <strong>$500</strong>. We'd rather have you in the room at a price that works for you than not at all &mdash; so if something lower feels right, tell us what and we'll honor it.
            </p>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label style="display: flex; gap: 0.5rem; align-items: center; padding: 0.6rem 0.85rem; border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">
                <input type="radio" name="contribution" value="full" required onchange="document.getElementById('pwyc-box').style.display='none'" checked />
                <span>Yes, $500 works.</span>
              </label>
              <label style="display: flex; gap: 0.5rem; align-items: center; padding: 0.6rem 0.85rem; border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">
                <input type="radio" name="contribution" value="pwyc" onchange="document.getElementById('pwyc-box').style.display='block'" />
                <span>I'd like to contribute a different amount.</span>
              </label>
            </div>
            <div id="pwyc-box" style="display: none; margin-top: 1rem; padding: 1rem 1.25rem; background: var(--surface); border-radius: 8px;">
              <label for="requested_amount" style="display: block; font-size: 0.9rem; font-weight: 500; margin-bottom: 0.35rem;">What feels right?</label>
              <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.85rem;">
                <span style="font-size: 1.05rem; color: var(--text-secondary);">$</span>
                <input type="number" id="requested_amount" name="requested_amount" min="0" max="500" step="1" placeholder="0" style="width: 8rem; font-size: 1rem;" />
              </div>
              <label for="requested_reason" style="display: block; font-size: 0.9rem; font-weight: 500; margin-bottom: 0.35rem;">Tell us a little about your reasoning <span style="color: var(--text-tertiary); font-weight: 400;">(optional)</span></label>
              <textarea id="requested_reason" name="requested_reason" rows={3} placeholder="Whatever feels true — your situation, what this contribution means to you, anything you want us to know."></textarea>
            </div>
          </div>

          <button type="submit" class="apply-btn">Submit Application</button>
        </form>
      </div>
    </Layout>
  )
})

pages.get('/apply/success', (c) => {
  const user = c.get('user')
  return c.html(
    <Layout title="Application Received" user={user}>
      <div class="page-section success-message" style="max-width: 600px; margin: 0 auto;">
        <h2>Application received</h2>
        <p class="lead">
          Thank you for applying. We'll review your application and get back to you soon — typically within a few days.
        </p>

        {!user && (
          <div style="margin-top: 2rem; padding: 1.5rem; background: var(--surface); border: 1px solid var(--accent); border-radius: 10px;">
            <h3 style="font-family: var(--font-display); margin: 0 0 0.5rem 0; color: var(--text);">One more thing — create your account</h3>
            <p style="margin: 0 0 1rem 0; color: var(--text-secondary); line-height: 1.6;">
              Applying didn't create an account for you. Create one now (using <strong>the same email you applied with</strong>) so your enrollment links automatically when we approve you.
            </p>
            <a href="/sign-up" style="display: inline-block; background: var(--accent); color: white; padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: 500;">
              Create Account →
            </a>
          </div>
        )}

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
      <Layout title="Application Status" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY}>
        <div class="page-section" style="max-width: 500px; margin: 0 auto; text-align: center; padding: 4rem 0;">
          <h2>No Application Found</h2>
          <p style="margin-top: 1rem; color: var(--text-secondary);">
            We couldn't find an application for <strong>{email}</strong>.
          </p>
          <p style="margin-top: 1.5rem;">
            <a href="/interest" style="color: var(--accent); font-weight: 500;">Join the interest list →</a>
          </p>
          <p style="margin-top: 1rem;">
            <a href="/apply/status" style="color: var(--text-tertiary);">← Try another email</a>
          </p>
        </div>
      </Layout>
    )
  }

  const amountCents = getApplicationAmount(app)

  return c.html(
    <Layout title="Application Status" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY}>
      <div class="page-section" style="max-width: 600px; margin: 0 auto;">
        <p class="section-label">Application Status</p>
        <h2>Hi {app.name.split(' ')[0]}</h2>

        <div style="margin-top: 2rem; padding: 1.5rem; border-radius: 10px; background: var(--surface);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-tertiary);">
              Applied {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span class={`badge badge-${app.status === 'approved' ? 'active' : app.status === 'enrolled' ? 'active' : app.status === 'rejected' ? 'completed' : 'pending'}`} style="font-size: 0.85rem;">
              {app.status === 'enrolled' ? 'enrolled' : app.status}
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
                  ? ` Complete your payment of ${formatCents(amountCents)} (${getApplicationLabel(app)}) to secure your spot.`
                  : ` Your spot has been sponsored — create your account to get started.`}
              </p>
              <a href={`/payment/checkout/${app.id}${app.paymentToken ? `?t=${app.paymentToken}` : ''}`} style="display: inline-block; background: var(--accent); color: white; padding: 0.85rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1.05rem;">
                {amountCents > 0 ? `Pay ${formatCents(amountCents)} & Enroll →` : 'Complete Enrollment →'}
              </a>
            </div>
          )}

          {app.status === 'enrolled' && (
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
