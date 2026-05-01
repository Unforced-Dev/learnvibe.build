import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { Layout } from '../components/Layout'
import { getDb } from '../db'
import { cohorts } from '../db/schema'
import type { AppContext } from '../types'

const home = new Hono<AppContext>()

const ArrowSvg = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
)

const SmallArrowSvg = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
)

// Compute "what week are we in" for a cohort by comparing today to its
// startDate. Week 1 starts on day 0; week N starts on day (N-1)*7. Returns
// null when the cohort has no startDate (or it parses as invalid) so the
// caller can fall back gracefully.
type CohortPhase = 'upcoming' | 'inflight' | 'completed'
type CohortProgress = { phase: CohortPhase; currentWeek: number; totalWeeks: number }

function computeCohortProgress(cohort: { startDate: string | null; weeks: number }): CohortProgress | null {
  if (!cohort.startDate) return null
  const start = new Date(cohort.startDate + 'T00:00:00')
  if (isNaN(start.getTime())) return null
  const dayMs = 1000 * 60 * 60 * 24
  const daysSince = (Date.now() - start.getTime()) / dayMs
  const totalWeeks = cohort.weeks
  if (daysSince < 0) return { phase: 'upcoming', currentWeek: 0, totalWeeks }
  const week = Math.floor(daysSince / 7) + 1
  if (week > totalWeeks) return { phase: 'completed', currentWeek: totalWeeks, totalWeeks }
  return { phase: 'inflight', currentWeek: week, totalWeeks }
}

home.get('/', async (c) => {
  const user = c.get('user')
  const db = getDb(c.env.DB)
  const cohort1 = await db.select().from(cohorts).where(eq(cohorts.slug, 'cohort-1')).get()
  const progress = cohort1 ? computeCohortProgress(cohort1) : null

  // The hero badge text adapts to where the cohort is in its run. Used in two
  // places (hero pill + Cohort 1 card badge) so we compute it once.
  const cohortStatusLabel = (() => {
    if (!progress) return 'Cohort 1'
    if (progress.phase === 'inflight') return `Cohort 1 in flight · Week ${progress.currentWeek} of ${progress.totalWeeks}`
    if (progress.phase === 'completed') return 'Cohort 1 · Complete'
    return 'Cohort 1 · Coming'
  })()

  return c.html(
    <Layout
      title="Build your personal AI assistant"
      description="In 6 weeks, build your own personal agentic assistant — one that knows you, has hands in your world, and helps you live and create more effectively. Cohort-based, in Boulder, CO & remote."
      user={user}
      fullWidth
    >
      {/* HERO */}
      <section class="hero">
        <h1 class="hero-title">Build your personal <span class="accent">AI assistant</span></h1>
        <p class="hero-subtitle">In 6 weeks, build your own agentic assistant &mdash; one that knows you, has hands in your world, and helps you live and create more effectively. No coding experience needed.</p>
        <p style="margin-top: 1rem; color: var(--text-tertiary); font-style: italic;">A community of practice for AI. We learn and grow together.</p>

        <div style="margin-top: 1.5rem; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.85rem; background: var(--surface); border: 1px solid var(--border); border-radius: 999px; font-family: var(--font-mono); font-size: 0.78rem; letter-spacing: 0.02em; color: var(--text-secondary);">
          <span style="display: inline-block; width: 0.5rem; height: 0.5rem; border-radius: 999px; background: var(--accent);"></span>
          {cohortStatusLabel}
        </div>

        <a href="/apply" class="hero-cta" style="margin-top: 1.25rem;">
          Apply for the next cohort
          <ArrowSvg />
        </a>
        <p class="hero-meta">Mondays 5:30&ndash;7:30pm MT<span class="sep">&middot;</span>6 Weeks<span class="sep">&middot;</span>Boulder, CO &amp; Remote<span class="sep">&middot;</span>$500 (sliding-scale)</p>
        <p style="margin-top: 1rem; font-size: 0.85rem;"><a href="/apply/status" style="color: var(--text-tertiary); text-decoration: none;">Already applied? Check your status &rarr;</a></p>
      </section>

      <div class="hp-divider"><hr /></div>

      {/* THE JOURNEY: SIX C'S */}
      <div class="journey-band" id="journey">
        <section class="hp-section">
          <p class="section-label">The Journey</p>
          <h2>Six weeks, six movements of the same practice.</h2>
          <p class="lead">We return to the same core moves each week, deepening as we go. Spirals, not stairs &mdash; you don't graduate from one to the next, you keep coming back, deeper each time.</p>

          <div class="journey-grid">
            <div class="journey-step">
              <p class="journey-step-num">Week 1</p>
              <h3 class="journey-step-title">Conversation</h3>
              <p>Three conversations: with yourself, with AI, with each other. Naming intention, asking questions before answers, and hearing what's actually alive in what you're trying to make.</p>
            </div>
            <div class="journey-step">
              <p class="journey-step-num">Week 2</p>
              <h3 class="journey-step-title">Context</h3>
              <p>A first chat with AI is meeting a brilliant stranger. We build a living document about you that any AI can know you through &mdash; and read each other's contexts back to find out what actually transferred.</p>
            </div>
            <div class="journey-step">
              <p class="journey-step-num">Week 3</p>
              <h3 class="journey-step-title">Connectors</h3>
              <p>AI with hands. Connecting agents to your tools and data so they can act in your world &mdash; calendar, notes, drive, your knowledge system &mdash; not just chat about it.</p>
            </div>
            <div class="journey-step">
              <p class="journey-step-num">Week 4</p>
              <h3 class="journey-step-title">Craft</h3>
              <p>Making what you need with AI as creative partner. Websites, trackers, small tools. Code is the deeper cut for those who want it &mdash; optional, never required.</p>
            </div>
            <div class="journey-step">
              <p class="journey-step-num">Week 5</p>
              <h3 class="journey-step-title">Coordination</h3>
              <p>Weaving your agents together into a single assistant that organizes your life, hiding the complexity behind the scenes.</p>
            </div>
            <div class="journey-step">
              <p class="journey-step-num">Week 6</p>
              <h3 class="journey-step-title">Community</h3>
              <p>Demo, reflect, and the path forward. Stepping into ongoing practice with the people who've been building alongside you.</p>
            </div>
          </div>
        </section>
      </div>

      <div class="hp-divider"><hr /></div>

      {/* ABOUT */}
      <section class="hp-section hp-section-narrow">
        <p class="section-label">The Idea</p>
        <h2>A practice, not a tools tour</h2>
        <p class="lead">AI is moving fast. The tools change every month. What doesn't change is the shape of working well with AI &mdash; and that's what we practice, together.</p>
        <p>Think of it like Taiji: you can spend weeks on the same standing, the same movement, letting it deepen. Our course is the same. We return to the core moves &mdash; conversation, context, connection &mdash; each week, and each time you come back to them they go deeper. By the end, you have not just a set of tricks but a relationship with these tools that travels with you wherever they go next.</p>
        <p>The outcome is a personal assistant that knows you. The path is a community that learns together.</p>
      </section>

      <div class="hp-divider"><hr /></div>

      {/* COHORT 1 (in flight) + COHORT 2 + CU CLASS */}
      <section class="hp-section hp-section-narrow" id="cohort">
        <p class="section-label">What's happening</p>
        <h2>Cohort 1 is in flight. Cohort 2 is forming.</h2>
        <p class="lead">Around 30 builders are in the room with us right now &mdash; full house Week 1, and the cohort is moving through the Six C's together. The next cohort is forming. Apply now and we'll be in touch as dates come into focus.</p>

        <div class="cohort-card">
          <span class="cohort-badge badge-open">{progress?.phase === 'inflight' ? `In flight · Week ${progress.currentWeek} of ${progress.totalWeeks}` : progress?.phase === 'completed' ? 'Complete' : 'Cohort 1'}</span>
          <h3>Cohort 1 &mdash; Practice</h3>
          <p class="cohort-detail">Mondays 5:30&ndash;7:30pm MT &middot; 6 weeks &middot; Boulder, CO &amp; Remote &middot; ~30 builders</p>
          <p>Two-hour live session each Monday with core curriculum and live demonstration. A weekly open circle for sharing what you're making, trying, or noticing. Hybrid coworking on Thursday afternoons at Regen Hub. Plus a community platform to share projects, ask questions, and learn from each other.</p>

          <div class="cohort-weeks">
            <div class="cohort-week"><strong>Conversation</strong><span>Week 1</span></div>
            <div class="cohort-week"><strong>Context</strong><span>Week 2</span></div>
            <div class="cohort-week"><strong>Connectors</strong><span>Week 3</span></div>
            <div class="cohort-week"><strong>Craft</strong><span>Week 4</span></div>
            <div class="cohort-week"><strong>Coordination</strong><span>Week 5</span></div>
            <div class="cohort-week"><strong>Community</strong><span>Week 6</span></div>
          </div>

          <div style="margin-top: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
            <a href="/curriculum" style="padding: 0.75rem 1.5rem; background: var(--surface); border: 1px solid var(--border); color: var(--text); border-radius: 8px; text-decoration: none; font-size: 0.95rem; font-weight: 500; display: inline-flex; align-items: center; gap: 0.4rem;">
              Read the curriculum
              <SmallArrowSvg />
            </a>
            {progress?.phase === 'inflight' && user && (
              <a href="/dashboard" style="padding: 0.75rem 1.5rem; color: var(--text-secondary); font-size: 0.95rem; text-decoration: none; display: inline-flex; align-items: center;">Your dashboard &rarr;</a>
            )}
          </div>
        </div>

        <div class="cohort-card" style="margin-top: 1.5rem;">
          <span class="cohort-badge" style="background: var(--surface); color: var(--text-secondary); border: 1px solid var(--border);">Coming next</span>
          <h3>Cohort 2 &mdash; Forming</h3>
          <p class="cohort-detail">Dates coming soon &middot; same shape, deeper from what we're learning now</p>
          <p>The next cohort is being shaped from what's surfacing inside Cohort 1 &mdash; pacing, demos, where the practice goes deepest. Apply now and we'll be in touch as the dates land. Cost should never be a barrier; we'll work with you on what makes sense.</p>

          <p style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);"><strong style="font-family: var(--font-mono); font-size: 1.1rem;">$500</strong> <span style="color: var(--text-tertiary);">general admission &mdash; sliding-scale and sponsored spots available. <a href="mailto:ag@unforced.dev" style="color: var(--accent);">Reach out</a> if cost is a question.</span></p>

          <div style="margin-top: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
            <a href="/apply" class="hero-cta" style="font-size: 0.95rem; padding: 0.75rem 1.5rem;">
              Apply for the next cohort
              <SmallArrowSvg />
            </a>
            <a href="/apply/status" style="padding: 0.75rem 1.5rem; color: var(--text-secondary); font-size: 0.95rem; text-decoration: none; display: inline-flex; align-items: center;">Check your status &rarr;</a>
          </div>
        </div>

        <div style="margin-top: 1.5rem; padding: 1.5rem 1.75rem; background: var(--white); border: 1px solid var(--border); border-radius: 10px;">
          <p class="section-label" style="margin-bottom: 0.4rem;">At CU Boulder &middot; Fall 2026</p>
          <h3 style="font-family: var(--font-display); font-weight: 600; font-size: 1.15rem; letter-spacing: -0.01em; margin: 0 0 0.5rem;">ATLS 4519 &mdash; Learn Vibe Build</h3>
          <p style="margin: 0; color: var(--text-secondary); line-height: 1.6;">Aaron is teaching a semester-long version of this work at CU Boulder's ATLAS Institute in Fall 2026 &mdash; same lineage, longer arc. Distinct from the cohort but part of the same practice.</p>
        </div>
      </section>

      <div class="hp-divider"><hr /></div>

      {/* PILOT + COHORT 1 SOCIAL PROOF */}
      <section class="hp-section hp-section-narrow">
        <p class="section-label">The lineage</p>
        <h2>It started with a pilot.</h2>
        <p class="lead">Cohort 0 ran in January 2026 &mdash; 13 builders, 4 weeks, real projects deployed to the internet. Cohort 1 is now mid-flight, ~30 builders deep, moving through the full 6-week Six C's arc. Here's what folks from the pilot had to say.</p>

        <div class="outcomes-grid">
          <div class="outcome-stat">
            <div class="outcome-number">13</div>
            <div class="outcome-label">builders in the pilot</div>
          </div>
          <div class="outcome-stat">
            <div class="outcome-number">~30</div>
            <div class="outcome-label">in Cohort 1, in flight now</div>
          </div>
          <div class="outcome-stat">
            <div class="outcome-number">0</div>
            <div class="outcome-label">coding experience required</div>
          </div>
        </div>

        <div class="testimonial">
          <blockquote>&ldquo;A challenging and mind-stretching opportunity to try out how you might want to interact with AI, our new &lsquo;cognitive appliance,&rsquo; with support from a super-knowledgeable teacher and a cohort of motivated students.&rdquo;</blockquote>
          <p class="testimonial-author">&mdash; Cohort 0 participant</p>
        </div>

        <div class="testimonial" style="margin-top: 1rem;">
          <blockquote>&ldquo;Seeing all the stuff that other folks were building!&rdquo;</blockquote>
          <p class="testimonial-author">&mdash; Cohort 0 participant, on what stood out most</p>
        </div>
      </section>

      <div class="hp-divider"><hr /></div>

      {/* COMMUNITY */}
      <section class="hp-section hp-section-narrow">
        <p class="section-label">The Community</p>
        <h2>Shared practice, not a performance.</h2>
        <p class="lead">Whether you've been building with AI for years or have never even talked to ChatGPT, this program meets you where you are.</p>
        <p>The magic isn't just the curriculum &mdash; it's the people. You'll be learning alongside creators, thinkers, and builders from all kinds of backgrounds, sharing what you're making, getting real feedback, and being inspired by what others are building.</p>
        <p>Every week has space for an open circle &mdash; time to share creations, process, what you're noticing, what you're stuck on. Not mandatory, not a demo day. The sharing is part of the practice.</p>
        <p>And it doesn't end when the cohort does. Completing the program opens the door to ongoing membership in the Learn Vibe Build community &mdash; continued access to the people, conversations, and resources that keep the momentum going.</p>

        <div style="margin-top: 2.5rem; padding: 1.75rem; background: var(--white); border: 1px solid var(--border); border-radius: 10px;">
          <p class="section-label" style="margin-bottom: 0.5rem;">Coming Soon</p>
          <h3 style="font-family: var(--font-display); font-weight: 600; font-size: 1.15rem; letter-spacing: -0.01em; margin: 0 0 0.75rem;">Advanced Agentic Engineering</h3>
          <p style="margin: 0; color: var(--text-secondary); line-height: 1.7;">For those interested in growing their skills as a developer and finding employment as an AI engineer. We have a growing network of companies looking for talented engineers &mdash; for those who want it, there's a pipeline.</p>
        </div>
      </section>

      <div class="hp-divider"><hr /></div>

      {/* WHO IT'S FOR */}
      <section class="hp-section hp-section-narrow">
        <p class="section-label">Who It's For</p>
        <h2>For people with ideas</h2>
        <p class="lead">This isn't about becoming a developer. It's about using AI to create what serves your life and work.</p>

        <div class="audience-list">
          <div class="audience-item">
            <span class="audience-role">Creators</span>
            <p>Who want a website, portfolio, or platform for their work</p>
          </div>
          <div class="audience-item">
            <span class="audience-role">Thinkers</span>
            <p>Who want to build tools for their own workflows and thinking</p>
          </div>
          <div class="audience-item">
            <span class="audience-role">Organizers</span>
            <p>Who need technology for their communities and projects</p>
          </div>
          <div class="audience-item">
            <span class="audience-role">Beginners</span>
            <p>Who've never written a line of code but have something they want to make</p>
          </div>
          <div class="audience-item">
            <span class="audience-role">Builders</span>
            <p>Who already work with AI and want to go deeper with agentic workflows</p>
          </div>
        </div>
      </section>

      <div class="hp-divider"><hr /></div>

      {/* GUIDES */}
      <section class="hp-section">
        <p class="section-label">Your Guides</p>
        <h2>Who you'll build with</h2>

        <div class="guides-grid">
          <div class="guide">
            <h3 class="guide-name">Aaron Gabriel</h3>
            <p class="guide-role">Lead Facilitator</p>
            <p class="guide-bio">Founder of <a href="https://parachute.computer" target="_blank">Parachute</a>, graduate student at CU Boulder's ATLAS, founding member of <a href="https://regenhub.xyz" target="_blank">Regen Hub Cooperative</a>. Has spent the last year building with AI every day &mdash; including his own personal AI agent.</p>
          </div>
          <div class="guide">
            <h3 class="guide-name">Jon Bo</h3>
            <p class="guide-role">Co-Facilitator</p>
            <p class="guide-bio">3x founding engineer, builder of things, writer of words. Daily user of Claude Code. Brings deep engineering experience to help you build real things that work.</p>
          </div>
        </div>
      </section>

      <div class="hp-divider"><hr /></div>

      {/* FAQ */}
      <section class="hp-section hp-section-narrow" id="faq">
        <p class="section-label">FAQ</p>
        <h2>Common questions</h2>

        <div class="faq-list">
          <div class="faq-item">
            <h3 class="faq-q">Do I need coding experience?</h3>
            <p class="faq-a">No. The program is designed for people who have never written a line of code. In Week 4 we make things with AI as creative partner &mdash; you provide the direction and taste, the AI does the mechanics. Code is the deeper cut for those who want to go further.</p>
          </div>
          <div class="faq-item">
            <h3 class="faq-q">What tech do I need?</h3>
            <p class="faq-a">A laptop and a Claude account. We'll walk you through everything else in the first session. Claude Pro ($20/month) is recommended for the best experience.</p>
          </div>
          <div class="faq-item">
            <h3 class="faq-q">Is it in-person or remote?</h3>
            <p class="faq-a">Both. Weekly sessions happen in-person at <a href="https://regenhub.xyz" style="color: var(--accent); text-decoration: none;">Regen Hub</a> in Boulder, CO and are available remotely. Coworking hours on Thursday afternoons are hybrid.</p>
          </div>
          <div class="faq-item">
            <h3 class="faq-q">How much time per week?</h3>
            <p class="faq-a">5&ndash;10 hours per week is ideal, but it's up to you. The work you do in this class should actively help you in areas of your life &mdash; giving you time back rather than taking it.</p>
          </div>
          <div class="faq-item">
            <h3 class="faq-q">What will I build?</h3>
            <p class="faq-a">That's up to you. Past students have built personal websites, workflow tools, creative platforms, and business apps. By the end, you'll also set up the foundation for your own personal AI assistant &mdash; one that knows you and helps you live and create more effectively.</p>
          </div>
          <div class="faq-item">
            <h3 class="faq-q">When does the next cohort start?</h3>
            <p class="faq-a">Cohort 1 is in flight now (April&ndash;May 2026). Cohort 2 dates aren't set yet &mdash; we're shaping it from what's surfacing in Cohort 1. Apply now and we'll be in touch as soon as we know.</p>
          </div>
          <div class="faq-item">
            <h3 class="faq-q">What's the pricing?</h3>
            <p class="faq-a"><strong>$500</strong> general admission. The application has a sliding-scale option &mdash; tell us what works for you and we'll honor it. Sponsored spots are available too. Cost should never be a barrier.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section class="cta-section">
        <div class="cta-content">
          <h2>Ready to build an assistant that knows you?</h2>
          <p>Cohort 2 is forming. Six weeks of practice, together. Apply now and we'll be in touch as dates come into focus.</p>
          <a href="/apply" class="cta-btn">
            Apply for the next cohort
            <ArrowSvg />
          </a>
          <p class="cta-aside">Questions? <a href="mailto:ag@unforced.dev">Reach out</a> &mdash; the next step is a conversation.</p>
        </div>
      </section>
    </Layout>
  )
})

export default home
