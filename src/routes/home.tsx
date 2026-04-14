import { Hono } from 'hono'
import { Layout } from '../components/Layout'
import type { AppContext } from '../types'

const home = new Hono<AppContext>()

const ArrowSvg = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
)

const SmallArrowSvg = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
)

home.get('/', (c) => {
  const user = c.get('user')

  return c.html(
    <Layout
      title="From Conversation to Coordinator"
      description="In 6 weeks, go from your first conversation with AI to orchestrating your own personal AI agent. Cohort-based program in Boulder, CO & remote."
      user={user}
      fullWidth
    >
      {/* HERO */}
      <section class="hero">
        <h1 class="hero-title">From Conversation<br />to <span class="accent">Coordinator</span></h1>
        <p class="hero-subtitle">In 6 weeks, go from your first conversation with AI to orchestrating your own personal AI agent. No coding experience needed.</p>
        <a href="/apply" class="hero-cta">
          Apply for Cohort 1
          <ArrowSvg />
        </a>
        <p class="hero-meta">Mondays 5:30&ndash;7:30pm MT<span class="sep">&middot;</span>Starting April 20, 2026<span class="sep">&middot;</span>6 Weeks<span class="sep">&middot;</span>$500<span class="sep">&middot;</span>Boulder, CO &amp; Remote</p>
        <p style="margin-top: 1rem; font-size: 0.85rem;"><a href="/apply/status" style="color: var(--text-tertiary); text-decoration: none;">Already applied? Check your status &rarr;</a></p>
      </section>

      <div class="hp-divider"><hr /></div>

      {/* THE JOURNEY: SIX C'S */}
      <div class="journey-band" id="journey">
        <section class="hp-section">
          <p class="section-label">The Journey</p>
          <h2>Six weeks. Six skills. One destination.</h2>
          <p class="lead">Each week builds on the last. By the end, you'll have the skills to set up your own personal AI system &mdash; an agent that works the way you think.</p>

          <div class="journey-grid">
            <div class="journey-step">
              <p class="journey-step-num">Week 1</p>
              <h3 class="journey-step-title">Conversation</h3>
              <p>Learn to think out loud with AI. Orientation, creative collaboration, finding your felt sense for what you want to build.</p>
            </div>
            <div class="journey-step">
              <p class="journey-step-num">Week 2</p>
              <h3 class="journey-step-title">Connectors</h3>
              <p>Give AI hands. Connect it to your files, data, and tools using MCPs &mdash; the protocol that lets AI reach into your world.</p>
            </div>
            <div class="journey-step">
              <p class="journey-step-num">Week 3</p>
              <h3 class="journey-step-title">Context</h3>
              <p>Teach AI how you think. CLAUDE.md files, knowledge architecture, prompt craft &mdash; the art of passing the right context.</p>
            </div>
            <div class="journey-step">
              <p class="journey-step-num">Week 4</p>
              <h3 class="journey-step-title">Cowork</h3>
              <p>Build together. Claude as your creative partner &mdash; collaborative projects, iterative design, real output.</p>
            </div>
            <div class="journey-step">
              <p class="journey-step-num">Week 5</p>
              <h3 class="journey-step-title">Code</h3>
              <p>Let AI work for you. Claude Code, the command line, agentic workflows &mdash; building real things autonomously.</p>
            </div>
            <div class="journey-step">
              <p class="journey-step-num">Week 6</p>
              <h3 class="journey-step-title">Coordinator</h3>
              <p>Orchestrate it all. Multi-agent design, your personal AI system, demo day &mdash; and the path forward.</p>
            </div>
          </div>
        </section>
      </div>

      <div class="hp-divider"><hr /></div>

      {/* ABOUT */}
      <section class="hp-section hp-section-narrow">
        <p class="section-label">The Idea</p>
        <h2>Everyone is a builder</h2>
        <p class="lead">You don't need to become a developer. You need an idea and the words to bring it to life. AI changes what's possible &mdash; if you know how to work with it.</p>
        <p>Learn Vibe Build teaches you to use AI as a thinking partner and building collaborator. Not prompt engineering tricks &mdash; real creative partnership. The skill being developed is <strong>clarity</strong>: learning to see what you want to make and articulate it into existence.</p>
        <p>By week 6, you won't just have built a project &mdash; you'll understand how to orchestrate AI to work the way you think. That's the difference between using a tool and having a partner.</p>
      </section>

      <div class="hp-divider"><hr /></div>

      {/* COHORT 1 */}
      <section class="hp-section hp-section-narrow" id="cohort">
        <p class="section-label">Cohort 1</p>
        <h2>The next cohort</h2>
        <p class="lead">13 builders came through our pilot cohort and shipped real projects. Cohort 1 goes deeper &mdash; 6 weeks following the Six C's from conversation to coordinator.</p>

        <div class="cohort-card">
          <span class="cohort-badge badge-open">Now Enrolling</span>
          <h3>Cohort 1 &mdash; Practice</h3>
          <p class="cohort-detail">Mondays 5:30&ndash;7:30pm MT &middot; Starting April 20, 2026 &middot; 6 weeks &middot; Boulder, CO &amp; Remote</p>
          <p>Weekly 2-hour live session (Mondays 5:30&ndash;7:30pm MT) with core curriculum and live demonstration. Weekly 2-hour co-working &amp; office hours for hands-on building. Plus a community platform to share projects, ask questions, and learn from each other.</p>

          <div class="cohort-weeks">
            <div class="cohort-week"><strong>Conversation</strong><span>Week 1</span></div>
            <div class="cohort-week"><strong>Connectors</strong><span>Week 2</span></div>
            <div class="cohort-week"><strong>Context</strong><span>Week 3</span></div>
            <div class="cohort-week"><strong>Cowork</strong><span>Week 4</span></div>
            <div class="cohort-week"><strong>Code</strong><span>Week 5</span></div>
            <div class="cohort-week"><strong>Coordinator</strong><span>Week 6</span></div>
          </div>

          <p style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);"><strong style="font-family: var(--font-mono); font-size: 1.1rem;">$500</strong> <span style="color: var(--text-tertiary);">&mdash; Discounted and sponsored spots available. Cost should never be a barrier &mdash; <a href="mailto:ag@unforced.dev" style="color: var(--accent);">reach out</a>.</span></p>

          <div style="margin-top: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
            <a href="/apply" class="hero-cta" style="font-size: 0.95rem; padding: 0.75rem 1.5rem;">
              Apply Now
              <SmallArrowSvg />
            </a>
            <a href="/apply/status" style="padding: 0.75rem 1.5rem; color: var(--text-secondary); font-size: 0.95rem; text-decoration: none; display: inline-flex; align-items: center;">Check your status &rarr;</a>
          </div>
        </div>
      </section>

      <div class="hp-divider"><hr /></div>

      {/* OUTCOMES */}
      <section class="hp-section hp-section-narrow">
        <p class="section-label">Pilot Cohort</p>
        <h2>13 builders shipped</h2>
        <p class="lead">Our pilot cohort ran in January 2026 &mdash; 13 people, 4 weeks, real projects deployed to the internet. Here's what they had to say.</p>

        <div class="outcomes-grid">
          <div class="outcome-stat">
            <div class="outcome-number">13</div>
            <div class="outcome-label">builders in the pilot</div>
          </div>
          <div class="outcome-stat">
            <div class="outcome-number">4</div>
            <div class="outcome-label">weeks, idea to deployed</div>
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
        <h2>All levels. Real community.</h2>
        <p class="lead">Whether you've been building with AI for years or have never even talked to ChatGPT, this program meets you where you are.</p>
        <p>The magic isn't just the curriculum &mdash; it's the people. You'll be learning alongside creators, thinkers, and builders from all kinds of backgrounds, sharing what you're making, getting real feedback, and being inspired by what others are building.</p>
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
            <p class="faq-a">No. The program is designed for people who have never written a line of code. By week 5, you'll be using Claude Code to build real things &mdash; the AI does the coding, you provide the direction and taste.</p>
          </div>
          <div class="faq-item">
            <h3 class="faq-q">What tech do I need?</h3>
            <p class="faq-a">A laptop and a Claude account. We'll walk you through everything else in the first session. Claude Pro ($20/month) is recommended for the best experience.</p>
          </div>
          <div class="faq-item">
            <h3 class="faq-q">Is it in-person or remote?</h3>
            <p class="faq-a">Both. Weekly sessions happen in-person at <a href="https://regenhub.xyz" style="color: var(--accent); text-decoration: none;">Regen Hub</a> in Boulder, CO and are available remotely. Co-working hours are hybrid.</p>
          </div>
          <div class="faq-item">
            <h3 class="faq-q">How much time per week?</h3>
            <p class="faq-a">5&ndash;10 hours per week is ideal, but it's up to you. The work you do in this class should actively help you in areas of your life &mdash; giving you time back rather than taking it.</p>
          </div>
          <div class="faq-item">
            <h3 class="faq-q">What will I build?</h3>
            <p class="faq-a">That's up to you. Past students have built personal websites, workflow tools, creative platforms, and business apps. By week 6, you'll also set up the foundation for your own personal AI agent &mdash; a system that works the way you think.</p>
          </div>
          <div class="faq-item">
            <h3 class="faq-q">What's the pricing?</h3>
            <p class="faq-a"><strong>$500</strong> general admission. Discounted and sponsored spots are available &mdash; cost should never be a barrier. <a href="mailto:ag@unforced.dev" style="color: var(--accent);">Reach out</a> and we'll work with you.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section class="cta-section">
        <div class="cta-content">
          <h2>Ready to build your AI agent?</h2>
          <p>Cohort 1 starts April 20, 2026. Six weeks from conversation to coordinator. Spaces are limited.</p>
          <a href="/apply" class="cta-btn">
            Apply for Cohort 1
            <ArrowSvg />
          </a>
          <p class="cta-aside">Questions? <a href="mailto:aaron@learnvibe.build">Reach out</a> &mdash; the next step is a conversation.</p>
        </div>
      </section>
    </Layout>
  )
})

export default home
