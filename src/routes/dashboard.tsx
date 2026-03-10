import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { Layout } from '../components/Layout'
import { getDb } from '../db'
import { enrollments, cohorts } from '../db/schema'
import { isClerkConfigured } from '../lib/auth'
import type { AppContext } from '../types'

const dashboard = new Hono<AppContext>()

dashboard.get('/dashboard', async (c) => {
  const user = c.get('user')

  // Redirect to sign-in if not authenticated
  if (!user) {
    if (!isClerkConfigured(c)) {
      return c.html(
        <Layout title="Dashboard" user={null}>
          <div class="page-section" style="max-width: 600px; margin: 0 auto; padding: 4rem 0; text-align: center;">
            <h2>Dashboard</h2>
            <p style="margin-top: 1rem; color: var(--text-secondary);">
              Authentication is not yet configured. Check back soon.
            </p>
            <a href="/" style="margin-top: 2rem; display: inline-block; color: var(--accent);">← Back to Home</a>
          </div>
        </Layout>
      )
    }
    return c.redirect('/sign-in')
  }

  // Get user's enrollments
  const db = getDb(c.env.DB)
  const userEnrollments = await db
    .select({
      enrollment: enrollments,
      cohort: cohorts,
    })
    .from(enrollments)
    .innerJoin(cohorts, eq(enrollments.cohortId, cohorts.id))
    .where(eq(enrollments.userId, user.id))
    .all()

  return c.html(
    <Layout title="Dashboard" user={user}>
      <div class="page-section" style="max-width: 700px; margin: 0 auto;">
        <p class="section-label">Dashboard</p>
        <h2>Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}</h2>

        {userEnrollments.length > 0 ? (
          <>
            <p class="lead" style="margin-top: 0.5rem;">Your cohorts</p>
            <div class="week-grid" style="margin-top: 1.5rem;">
              {userEnrollments.map(({ enrollment, cohort }) => (
                <a href={`/cohort/${cohort.slug}`} class="week-card">
                  <div class="week-card-info">
                    <h3>{cohort.title}</h3>
                    {cohort.description && <p>{cohort.description}</p>}
                  </div>
                  <span class="week-card-meta">
                    <span class={`badge badge-${enrollment.status === 'active' ? 'active' : 'completed'}`}>
                      {enrollment.status}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </>
        ) : (
          <div style="margin-top: 2rem; padding: 2rem; background: var(--surface); border-radius: 10px;">
            <p style="color: var(--text-secondary);">
              You're not enrolled in any cohorts yet.
            </p>
            <a href="/apply" style="display: inline-block; margin-top: 1rem; color: var(--accent); font-weight: 500;">
              Apply for Cohort 2 →
            </a>
          </div>
        )}

        <div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border);">
          <p style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-tertiary);">
            {user.email} · {user.role}
          </p>
        </div>
      </div>
    </Layout>
  )
})

export default dashboard
