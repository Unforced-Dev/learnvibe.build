import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { Layout } from '../components/Layout'
import { getDb } from '../db'
import { applications } from '../db/schema'
import { formatCents, getAmountForTier, getTierLabel } from '../lib/stripe'
import type { AppContext } from '../types'

const pages = new Hono<AppContext>()

// ===== CURRICULUM PAGE =====
pages.get('/curriculum', (c) => {
  const user = c.get('user')

  const weeks = [
    {
      num: 1,
      title: 'Conversation',
      tagline: 'Learn to think out loud with AI',
      description: 'The foundation of everything that follows. How to orient toward AI with curiosity and clarity. Creative collaboration, felt sense, articulation — the skills that make every other week work.',
      youll_learn: [
        'How to talk to AI as a creative partner, not a search engine',
        'The "three ways of thinking" framework: with self, with others, with machines',
        'How to use your felt sense to guide what you build',
        'Voice input and rich context for better conversations',
      ],
      youll_build: 'Your first landing page — a prop for articulating your vision',
      tools: 'Claude Desktop',
    },
    {
      num: 2,
      title: 'Connectors',
      tagline: 'Give AI hands — connect it to your tools and data',
      description: 'AI is powerful in conversation. But when you connect it to your files, your data, and your services, it becomes transformative. MCPs (Model Context Protocol) are how you give AI access to your world.',
      youll_learn: [
        'What MCPs are and why they matter',
        'How to enable built-in connectors (web search, Google Drive, Notion)',
        'How to think about giving AI access to external systems',
        'Projects in Claude — persistent context for ongoing work',
      ],
      youll_build: 'A Claude Project for your main idea, connected to your tools',
      tools: 'Claude Desktop, MCPs / Connectors',
    },
    {
      num: 3,
      title: 'Context',
      tagline: 'Teach AI how you think',
      description: 'The difference between a generic AI response and a brilliant one is context. This week you learn the art of passing knowledge — files, memory, instructions — so AI understands not just what you want, but how you think.',
      youll_learn: [
        'CLAUDE.md files — teaching AI about your project',
        'Knowledge architecture — organizing what AI needs to know',
        'Prompt craft — writing instructions that get the output you want',
        'Working with files: reading, writing, and passing context',
      ],
      youll_build: 'A CLAUDE.md for your project and a structured knowledge base',
      tools: 'Claude Desktop, file system, markdown',
    },
    {
      num: 4,
      title: 'Cowork',
      tagline: 'Build together — AI as your creative partner',
      description: 'Move from conversation to collaboration. Claude Cowork lets you work alongside AI on real projects — designing, iterating, and building together in real time.',
      youll_learn: [
        'Claude Cowork — collaborative building with AI',
        'Iterative design: build, look, adjust, build',
        'How to direct AI while maintaining your creative vision',
        'Working with artifacts and previewing as you build',
      ],
      youll_build: 'A working project prototype — collaboratively built with AI',
      tools: 'Claude Cowork',
    },
    {
      num: 5,
      title: 'Code',
      tagline: 'Let AI work for you',
      description: 'Claude Code is AI in your terminal — a full agentic coding assistant that can read your codebase, run commands, and build real software. This is where your project becomes real.',
      youll_learn: [
        'Claude Code — AI with full file system and terminal access',
        'Git and GitHub — version control and collaboration',
        'The build workflow: idea → PRD → code → deploy',
        'Agentic workflows — AI working autonomously on multi-step tasks',
      ],
      youll_build: 'Your project, deployed to the internet with a real URL',
      tools: 'Claude Code, Git, GitHub, terminal',
    },
    {
      num: 6,
      title: 'Coordinator',
      tagline: 'Orchestrate it all — your personal AI system',
      description: 'The destination. Everything you\'ve learned comes together into a personal AI system — multiple agents, coordinated workflows, a partner that works the way you think. Plus: demo day.',
      youll_learn: [
        'Multi-agent design — coordinating multiple AI capabilities',
        'Personal agent setup — your own AI system',
        'How to keep building after the cohort ends',
        'The landscape: where AI is heading and how to stay on the frontier',
      ],
      youll_build: 'The foundation of your personal AI agent + demo your project',
      tools: 'Claude Code, agent frameworks, your full toolkit',
    },
  ]

  return c.html(
    <Layout
      title="Curriculum — The Six C's"
      description="Six weeks from Conversation to Coordinator. The Learn Vibe Build curriculum takes you from your first AI conversation to orchestrating your own personal AI agent."
      user={user}
    >
      <style dangerouslySetInnerHTML={{ __html: `@media (max-width: 600px) { .curriculum-detail-grid { grid-template-columns: 1fr !important; } }` }} />
      <div class="page-section" style="max-width: 800px; margin: 0 auto;">
        <a href="/" style="font-size: 0.85rem; color: var(--text-tertiary); text-decoration: none;">&larr; Home</a>

        <p class="section-label" style="margin-top: 2rem;">The Six C's</p>
        <h2>From Conversation to Coordinator</h2>
        <p class="lead">
          Each week builds on the last. You start by learning to talk to AI. You end by orchestrating your own personal AI system. No coding experience needed.
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
          <a href="/apply" style="display: inline-flex; align-items: center; gap: 0.5rem; background: var(--accent); color: white; font-size: 1rem; font-weight: 500; padding: 0.875rem 2rem; border-radius: 8px; text-decoration: none;">
            Apply for Cohort 1
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
          <p style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-tertiary);">
            Starting April 20, 2026 &middot; 6 weeks &middot; Boulder, CO &amp; Remote
          </p>
        </div>
      </div>
    </Layout>
  )
})

pages.get('/apply', (c) => {
  const error = c.req.query('error')

  const errorMessages: Record<string, string> = {
    missing_fields: 'Please fill out all required fields.',
    invalid_email: 'Please enter a valid email address.',
    server_error: 'Something went wrong. Please try again.',
  }

  return c.html(
    <Layout
      title="Apply for Cohort 1"
      description="Apply for Learn Vibe Build Cohort 1 — 6 weeks of building with AI as your creative partner."
      user={c.get('user')}
    >
      <div class="page-section">
        <p class="section-label">Apply</p>
        <h2>Apply for Cohort 1</h2>
        <p class="lead">
          6 weeks of building with AI as your creative partner. Starting April 2026 in Boulder, CO &amp; remote.
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
          Thank you for applying to Cohort 1. We'll review your application and get back to you soon.
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
            <a href="/apply" style="color: var(--accent); font-weight: 500;">Apply for Cohort 1 →</a>
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
                  ? ` Complete your payment of ${formatCents(amountCents)} (${getTierLabel(app.pricingTier)}) to secure your spot.`
                  : ` Your spot has been sponsored — create your account to get started.`}
              </p>
              <a href={`/payment/checkout/${app.id}`} style="display: inline-block; background: var(--accent); color: white; padding: 0.85rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1.05rem;">
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
