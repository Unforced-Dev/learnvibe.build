import { Hono } from 'hono'
import { eq, desc, asc, and } from 'drizzle-orm'
import { Layout } from '../components/Layout'
import { getDb } from '../db'
import { applications, cohorts, lessons, users, enrollments, payments } from '../db/schema'
import { isAdmin, isClerkConfigured } from '../lib/auth'
import { formatCents, getAmountForTier, getTierLabel } from '../lib/stripe'
import { sendBroadcast, isEmailConfigured } from '../lib/email'
import { marked } from 'marked'
import type { AppContext } from '../types'

const admin = new Hono<AppContext>()

// ===== ADMIN GUARD =====
// When Clerk is configured: require admin role
// When Clerk is NOT configured (dev): allow access for development
admin.use('/admin/*', async (c, next) => {
  const user = c.get('user')

  // If Clerk is not configured, allow access (dev mode)
  if (!isClerkConfigured(c)) {
    await next()
    return
  }

  // If not logged in, redirect to sign-in (don't show 403 for transient auth failures)
  if (!user) {
    return c.redirect('/sign-in')
  }

  // In production, require admin role
  if (!isAdmin(user)) {
    return c.html(
      <Layout title="Unauthorized" user={user}>
        <div class="page-section" style="max-width: 500px; margin: 0 auto; text-align: center; padding: 6rem 0;">
          <h2>Unauthorized</h2>
          <p style="margin-top: 1rem; color: var(--text-secondary);">
            You need admin access to view this page.
          </p>
          <a href="/" style="margin-top: 2rem; display: inline-block; color: var(--accent);">← Back to Home</a>
        </div>
      </Layout>,
      403
    )
  }
  await next()
})

// ===== ADMIN DASHBOARD =====
admin.get('/admin', async (c) => {
  const user = c.get('user')!
  const db = getDb(c.env.DB)

  const [appCount, lessonCount, cohortList] = await Promise.all([
    db.select().from(applications).all(),
    db.select().from(lessons).all(),
    db.select().from(cohorts).orderBy(asc(cohorts.id)).all(),
  ])

  const pendingApps = appCount.filter(a => a.status === 'pending').length
  const totalApps = appCount.length

  return c.html(
    <Layout title="Admin Dashboard" user={user} noindex>
      <div class="page-section" style="max-width: 800px; margin: 0 auto;">
        <p class="section-label">Admin</p>
        <h2>Dashboard</h2>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 2rem;">
          <a href="/admin/applications" class="admin-stat-card">
            <span class="admin-stat-number">{pendingApps}</span>
            <span class="admin-stat-label">Pending Applications</span>
            <span style="font-size: 0.8rem; color: var(--text-tertiary);">{totalApps} total</span>
          </a>
          <a href="/admin/lessons" class="admin-stat-card">
            <span class="admin-stat-number">{lessonCount.length}</span>
            <span class="admin-stat-label">Lessons</span>
          </a>
          <div class="admin-stat-card">
            <span class="admin-stat-number">{cohortList.length}</span>
            <span class="admin-stat-label">Cohorts</span>
          </div>
        </div>

        <div style="margin-top: 3rem;">
          <h3 style="font-family: var(--font-display); margin-bottom: 1rem;">Quick Actions</h3>
          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <a href="/admin/applications" class="admin-action-btn">Review Applications</a>
            <a href="/admin/lessons" class="admin-action-btn">Manage Lessons</a>
            <a href="/admin/lessons/new" class="admin-action-btn">Create Lesson</a>
            <a href="/admin/email" class="admin-action-btn">Send Email</a>
          </div>
        </div>

        <div style="margin-top: 3rem;">
          <h3 style="font-family: var(--font-display); margin-bottom: 1rem;">Cohorts</h3>
          {cohortList.map(cohort => (
            <div style="padding: 1rem; background: var(--surface); border-radius: 8px; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>{cohort.title}</strong>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-tertiary); margin-left: 0.75rem;">
                  {cohort.slug} · {cohort.status} · {cohort.isPublic ? 'Public' : 'Gated'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
})

// ===== APPLICATIONS LIST =====
admin.get('/admin/applications', async (c) => {
  const user = c.get('user')!
  const db = getDb(c.env.DB)

  const statusFilter = c.req.query('status') || 'all'
  let allApps = await db.select().from(applications).orderBy(desc(applications.createdAt)).all()

  if (statusFilter !== 'all') {
    allApps = allApps.filter(a => a.status === statusFilter)
  }

  return c.html(
    <Layout title="Applications" user={user} noindex>
      <div class="page-section" style="max-width: 900px; margin: 0 auto;">
        <a href="/admin" class="back-link">← Admin</a>
        <p class="section-label">Applications</p>
        <h2>Applications ({allApps.length})</h2>

        <div style="margin: 1.5rem 0; display: flex; gap: 0.5rem; flex-wrap: wrap;">
          {['all', 'pending', 'approved', 'rejected'].map(status => (
            <a
              href={`/admin/applications${status === 'all' ? '' : `?status=${status}`}`}
              style={`padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.85rem; text-decoration: none; ${statusFilter === status ? 'background: var(--accent); color: white;' : 'background: var(--surface); color: var(--text-secondary);'}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </a>
          ))}
        </div>

        {allApps.length === 0 ? (
          <p style="color: var(--text-tertiary); margin-top: 2rem;">No applications found.</p>
        ) : (
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            {allApps.map(app => (
              <a href={`/admin/applications/${app.id}`} class="admin-app-card">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div>
                    <strong>{app.name}</strong>
                    <span style="font-size: 0.85rem; color: var(--text-tertiary); margin-left: 0.5rem;">{app.email}</span>
                  </div>
                  <span class={`badge badge-${app.status === 'approved' ? 'active' : app.status === 'rejected' ? 'completed' : 'pending'}`}>
                    {app.status}
                  </span>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem; line-height: 1.5;">
                  {app.background.length > 150 ? app.background.substring(0, 150) + '...' : app.background}
                </p>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-tertiary);">
                  {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {app.cohortSlug && <> · {app.cohortSlug}</>}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
})

// ===== APPLICATION DETAIL =====
admin.get('/admin/applications/:id', async (c) => {
  const user = c.get('user')!
  const db = getDb(c.env.DB)
  const id = parseInt(c.req.param('id'), 10)

  const app = await db.select().from(applications).where(eq(applications.id, id)).get()

  if (!app) {
    return c.html(
      <Layout title="Not Found" user={user} noindex>
        <div class="page-section" style="text-align: center; padding: 6rem 0;">
          <h2>Application not found</h2>
          <a href="/admin/applications" class="back-link">← Back to applications</a>
        </div>
      </Layout>,
      404
    )
  }

  return c.html(
    <Layout title={`Application: ${app.name}`} user={user} noindex>
      <div class="page-section" style="max-width: 700px; margin: 0 auto;">
        <a href="/admin/applications" class="back-link">← All Applications</a>

        <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: start;">
          <div>
            <h2>{app.name}</h2>
            <p style="color: var(--text-secondary);">{app.email}</p>
          </div>
          <span class={`badge badge-${app.status === 'approved' ? 'active' : app.status === 'rejected' ? 'completed' : 'pending'}`} style="font-size: 0.9rem;">
            {app.status}
          </span>
        </div>

        <div style="margin-top: 2rem;">
          <div class="admin-detail-section">
            <h3>Background</h3>
            <p>{app.background}</p>
          </div>

          <div class="admin-detail-section">
            <h3>Project Interest</h3>
            <p>{app.projectInterest}</p>
          </div>

          <div class="admin-detail-section">
            <h3>Referral Source</h3>
            <p>{app.referralSource}</p>
          </div>

          <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.5rem;">
            <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-tertiary);">
              Applied {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-tertiary);">
              Cohort: {app.cohortSlug}
            </span>
            <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-tertiary);">
              Pricing: {app.pricingTier}
            </span>
          </div>
        </div>

        {app.notes && (
          <div class="admin-detail-section" style="background: var(--accent-soft); border-radius: 8px; padding: 1rem;">
            <h3>Admin Notes</h3>
            <p>{app.notes}</p>
          </div>
        )}

        {app.status === 'approved' && (
          <div style="margin-top: 2rem; padding: 1.5rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px;">
            <h3 style="font-family: var(--font-display); color: #166534; margin-bottom: 0.75rem;">✓ Approved — {getTierLabel(app.pricingTier)}</h3>
            <p style="font-size: 0.9rem; color: #15803d; margin-bottom: 1rem;">
              {getAmountForTier(app.pricingTier) > 0
                ? `Payment required: ${formatCents(getAmountForTier(app.pricingTier))}`
                : 'Sponsored — no payment needed'}
            </p>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 0.85rem; color: var(--text-secondary);">Payment link:</span>
                <code style="font-family: var(--font-mono); font-size: 0.8rem; background: white; padding: 0.4rem 0.75rem; border-radius: 4px; border: 1px solid #e5e7eb; word-break: break-all;">
                  {new URL(c.req.url).origin}/payment/checkout/{app.id}
                </code>
              </div>
              <button
                onclick={`navigator.clipboard.writeText('${new URL(c.req.url).origin}/payment/checkout/${app.id}').then(() => this.textContent = 'Copied!')`}
                style="align-self: start; padding: 0.4rem 1rem; background: #166534; color: white; border: none; border-radius: 6px; font-size: 0.85rem; cursor: pointer;"
              >
                Copy Payment Link
              </button>
            </div>
          </div>
        )}

        {(app.status as any) === 'enrolled' && (
          <div style="margin-top: 2rem; padding: 1.5rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;">
            <h3 style="font-family: var(--font-display); color: #1e40af; margin-bottom: 0.5rem;">🎓 Enrolled</h3>
            <p style="font-size: 0.9rem; color: #1e3a8a;">
              This applicant has paid and is enrolled in {app.cohortSlug}.
            </p>
          </div>
        )}

        {app.status === 'pending' && (
          <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border);">
            <h3 style="font-family: var(--font-display); margin-bottom: 1rem;">Actions</h3>

            <form method="post" action={`/api/admin/applications/${app.id}/status`} style="display: flex; flex-direction: column; gap: 1rem;">
              <div class="form-group">
                <label for="pricing_tier">Pricing Tier</label>
                <select id="pricing_tier" name="pricing_tier" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;">
                  <option value="standard">Full Price ($500)</option>
                  <option value="discounted">Discounted ($250)</option>
                  <option value="sponsor">Sponsored ($0)</option>
                </select>
              </div>

              <div class="form-group">
                <label for="notes">Admin Notes (optional)</label>
                <textarea id="notes" name="notes" rows={3} style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;"></textarea>
              </div>

              <div style="display: flex; gap: 1rem;">
                <button type="submit" name="action" value="approve" style="flex: 1; padding: 0.75rem; background: #16a34a; color: white; border: none; border-radius: 6px; font-size: 1rem; font-weight: 500; cursor: pointer;">
                  Approve
                </button>
                <button type="submit" name="action" value="reject" style="flex: 1; padding: 0.75rem; background: #dc2626; color: white; border: none; border-radius: 6px; font-size: 1rem; font-weight: 500; cursor: pointer;">
                  Reject
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  )
})

// ===== LESSONS LIST =====
admin.get('/admin/lessons', async (c) => {
  const user = c.get('user')!
  const db = getDb(c.env.DB)

  const allLessons = await db
    .select({
      lesson: lessons,
      cohort: cohorts,
    })
    .from(lessons)
    .innerJoin(cohorts, eq(lessons.cohortId, cohorts.id))
    .orderBy(asc(cohorts.id), asc(lessons.weekNumber))
    .all()

  return c.html(
    <Layout title="Manage Lessons" user={user} noindex>
      <div class="page-section" style="max-width: 900px; margin: 0 auto;">
        <a href="/admin" class="back-link">← Admin</a>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p class="section-label">Lessons</p>
            <h2>All Lessons ({allLessons.length})</h2>
          </div>
          <a href="/admin/lessons/new" style="display: inline-block; background: var(--accent); color: white; padding: 0.6rem 1.25rem; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 0.9rem;">
            + New Lesson
          </a>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 2rem;">
          {allLessons.map(({ lesson, cohort }) => (
            <a href={`/admin/lessons/${lesson.id}/edit`} style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--surface); border-radius: 8px; text-decoration: none; color: inherit; transition: background 0.2s;" class="admin-app-card">
              <div>
                <strong>Week {lesson.weekNumber}: {lesson.title}</strong>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-tertiary); margin-left: 0.75rem;">
                  {cohort.slug}
                </span>
              </div>
              <span class={`badge badge-${lesson.status === 'published' ? 'active' : 'pending'}`}>
                {lesson.status}
              </span>
            </a>
          ))}
        </div>
      </div>
    </Layout>
  )
})

// ===== NEW LESSON =====
admin.get('/admin/lessons/new', async (c) => {
  const user = c.get('user')!
  const db = getDb(c.env.DB)

  const cohortList = await db.select().from(cohorts).orderBy(asc(cohorts.id)).all()

  return c.html(
    <Layout title="New Lesson" user={user} noindex>
      <div class="page-section" style="max-width: 700px; margin: 0 auto;">
        <a href="/admin/lessons" class="back-link">← All Lessons</a>
        <p class="section-label">Create</p>
        <h2>New Lesson</h2>

        <form method="post" action="/api/admin/lessons" class="apply-form" style="margin-top: 2rem;">
          <div class="form-group">
            <label for="cohort_id">Cohort</label>
            <select id="cohort_id" name="cohort_id" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;">
              {cohortList.map(c => (
                <option value={String(c.id)}>{c.title} ({c.slug})</option>
              ))}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label for="week_number">Week Number</label>
              <input type="number" id="week_number" name="week_number" required min="1" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;" />
            </div>
            <div class="form-group">
              <label for="date">Date</label>
              <input type="date" id="date" name="date" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;" />
            </div>
          </div>

          <div class="form-group">
            <label for="title">Title</label>
            <input type="text" id="title" name="title" required placeholder="e.g., Orientation & Play" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;" />
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <input type="text" id="description" name="description" placeholder="Short summary of this lesson" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;" />
          </div>

          <div class="form-group">
            <label for="content_markdown">Content (Markdown)</label>
            <textarea
              id="content_markdown"
              name="content_markdown"
              rows={20}
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-family: var(--font-mono); font-size: 0.9rem; line-height: 1.6;"
              placeholder="## Lesson content in markdown..."
            ></textarea>
          </div>

          <div class="form-group">
            <label for="status">Status</label>
            <select id="status" name="status" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <button type="submit" class="apply-btn">Create Lesson</button>
        </form>
      </div>
    </Layout>
  )
})

// ===== EDIT LESSON =====
admin.get('/admin/lessons/:id/edit', async (c) => {
  const user = c.get('user')!
  const db = getDb(c.env.DB)
  const id = parseInt(c.req.param('id'), 10)

  const lesson = await db.select().from(lessons).where(eq(lessons.id, id)).get()
  if (!lesson) {
    return c.html(
      <Layout title="Not Found" user={user} noindex>
        <div class="page-section" style="text-align: center; padding: 6rem 0;">
          <h2>Lesson not found</h2>
          <a href="/admin/lessons" class="back-link">← Back to lessons</a>
        </div>
      </Layout>,
      404
    )
  }

  const cohortList = await db.select().from(cohorts).orderBy(asc(cohorts.id)).all()

  return c.html(
    <Layout title={`Edit: ${lesson.title}`} user={user} noindex>
      <div class="page-section" style="max-width: 700px; margin: 0 auto;">
        <a href="/admin/lessons" class="back-link">← All Lessons</a>
        <p class="section-label">Edit Lesson</p>
        <h2>Week {lesson.weekNumber}: {lesson.title}</h2>

        <form method="post" action={`/api/admin/lessons/${lesson.id}`} class="apply-form" style="margin-top: 2rem;">
          <div class="form-group">
            <label for="cohort_id">Cohort</label>
            <select id="cohort_id" name="cohort_id" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;">
              {cohortList.map(co => (
                <option value={String(co.id)} selected={co.id === lesson.cohortId}>{co.title} ({co.slug})</option>
              ))}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label for="week_number">Week Number</label>
              <input type="number" id="week_number" name="week_number" required min="1" value={String(lesson.weekNumber)} style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;" />
            </div>
            <div class="form-group">
              <label for="date">Date</label>
              <input type="date" id="date" name="date" value={lesson.date || ''} style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;" />
            </div>
          </div>

          <div class="form-group">
            <label for="title">Title</label>
            <input type="text" id="title" name="title" required value={lesson.title} style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;" />
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <input type="text" id="description" name="description" value={lesson.description || ''} style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;" />
          </div>

          <div class="form-group">
            <label for="content_markdown">Content (Markdown)</label>
            <textarea
              id="content_markdown"
              name="content_markdown"
              rows={25}
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-family: var(--font-mono); font-size: 0.9rem; line-height: 1.6;"
            >{lesson.contentMarkdown}</textarea>
          </div>

          <div class="form-group">
            <label for="status">Status</label>
            <select id="status" name="status" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;">
              <option value="draft" selected={lesson.status === 'draft'}>Draft</option>
              <option value="published" selected={lesson.status === 'published'}>Published</option>
            </select>
          </div>

          <div style="display: flex; gap: 1rem;">
            <button type="submit" class="apply-btn" style="flex: 1;">Save Changes</button>
            <a href={`/cohort/${cohortList.find(co => co.id === lesson.cohortId)?.slug}/week/${lesson.weekNumber}`}
               style="flex: 0; padding: 0.75rem 1.5rem; border: 1px solid var(--border); border-radius: 6px; text-decoration: none; color: var(--text-secondary); display: flex; align-items: center; white-space: nowrap;"
               target="_blank">
              Preview →
            </a>
          </div>
        </form>
      </div>
    </Layout>
  )
})

// ===== EMAIL BROADCAST =====
admin.get('/admin/email', async (c) => {
  const user = c.get('user')!
  const db = getDb(c.env.DB)
  const success = c.req.query('success')
  const sent = c.req.query('sent')
  const failed = c.req.query('failed')

  const cohortList = await db.select().from(cohorts).orderBy(asc(cohorts.id)).all()
  const emailConfigured = isEmailConfigured(c.env.RESEND_API_KEY)

  return c.html(
    <Layout title="Send Email" user={user} noindex>
      <div class="page-section" style="max-width: 700px; margin: 0 auto;">
        <a href="/admin" class="back-link">← Admin</a>
        <p class="section-label">Email</p>
        <h2>Send Email to Cohort</h2>

        {!emailConfigured && (
          <div style="margin-top: 1rem; padding: 1rem; background: #fef3cd; border: 1px solid #ffc107; border-radius: 8px; font-size: 0.9rem; color: #856404;">
            Email is not configured yet. Set the <code>RESEND_API_KEY</code> secret to enable sending.
          </div>
        )}

        {success === 'true' && (
          <div style="margin-top: 1rem; padding: 1rem; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; font-size: 0.9rem; color: #155724;">
            Email sent to {sent} recipient{sent !== '1' ? 's' : ''}{parseInt(failed || '0') > 0 ? ` (${failed} failed)` : ''}.
          </div>
        )}

        <form method="post" action="/api/admin/email/broadcast" class="apply-form" style="margin-top: 2rem;">
          <div class="form-group">
            <label for="audience">Send to</label>
            <select id="audience" name="audience" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;">
              <option value="all_approved">All approved applicants (not yet enrolled)</option>
              <option value="all_enrolled">All enrolled members</option>
              {cohortList.map(co => (
                <option value={`cohort_${co.id}`}>Enrolled in {co.title}</option>
              ))}
              <option value="all_applicants">All applicants (including pending)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="subject">Subject</label>
            <input type="text" id="subject" name="subject" required placeholder="e.g., Cohort 1 starts next Monday!" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;" />
          </div>

          <div class="form-group">
            <label for="body_markdown">Message (Markdown)</label>
            <textarea
              id="body_markdown"
              name="body_markdown"
              rows={15}
              required
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-family: var(--font-mono); font-size: 0.9rem; line-height: 1.6;"
              placeholder={"## Hey everyone!\n\nJust a quick update about Cohort 1...\n\n**Important:** We start next Monday at 6pm MT.\n\nSee you there!"}
            ></textarea>
          </div>

          <div style="display: flex; gap: 1rem; align-items: center;">
            <button type="submit" class="apply-btn" style="flex: 0 0 auto;">
              Send Email
            </button>
            <span style="font-size: 0.85rem; color: var(--text-tertiary);">
              This will send immediately — double-check before clicking.
            </span>
          </div>
        </form>
      </div>
    </Layout>
  )
})

// ===== API: BROADCAST EMAIL =====
admin.post('/api/admin/email/broadcast', async (c) => {
  const db = getDb(c.env.DB)
  const body = await c.req.parseBody()

  const audience = String(body.audience || '')
  const subject = String(body.subject || '').trim()
  const bodyMarkdown = String(body.body_markdown || '').trim()

  if (!subject || !bodyMarkdown) {
    return c.redirect('/admin/email?error=missing_fields')
  }

  // Render markdown to HTML
  const htmlContent = await marked(bodyMarkdown)

  // Build recipient list based on audience
  let emails: string[] = []

  if (audience === 'all_approved') {
    const apps = await db.select().from(applications)
      .where(eq(applications.status, 'approved'))
      .all()
    emails = apps.map(a => a.email)
  } else if (audience === 'all_enrolled') {
    const apps = await db.select().from(applications)
      .where(eq(applications.status, 'enrolled' as any))
      .all()
    // Also get users with active enrollments
    const enrolledUsers = await db.select({ email: users.email })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.userId, users.id))
      .all()
    const allEmails = new Set([...apps.map(a => a.email), ...enrolledUsers.map(u => u.email)])
    emails = Array.from(allEmails)
  } else if (audience.startsWith('cohort_')) {
    const cohortId = parseInt(audience.replace('cohort_', ''), 10)
    const enrolledUsers = await db.select({ email: users.email })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.userId, users.id))
      .where(eq(enrollments.cohortId, cohortId))
      .all()
    // Also get approved/enrolled applications for this cohort
    const cohort = await db.select().from(cohorts).where(eq(cohorts.id, cohortId)).get()
    if (cohort) {
      const apps = await db.select().from(applications)
        .where(eq(applications.cohortSlug, cohort.slug))
        .all()
      const approvedApps = apps.filter(a => a.status === 'approved' || (a.status as any) === 'enrolled')
      const allEmails = new Set([...enrolledUsers.map(u => u.email), ...approvedApps.map(a => a.email)])
      emails = Array.from(allEmails)
    } else {
      emails = enrolledUsers.map(u => u.email)
    }
  } else if (audience === 'all_applicants') {
    const apps = await db.select().from(applications).all()
    emails = apps.map(a => a.email)
  }

  if (emails.length === 0) {
    return c.redirect('/admin/email?error=no_recipients')
  }

  // Send broadcast
  const result = await sendBroadcast(c.env, emails, subject, htmlContent)

  return c.redirect(`/admin/email?success=true&sent=${result.sent}&failed=${result.failed}`)
})

// ===== API ADMIN GUARD =====
admin.use('/api/admin/*', async (c, next) => {
  if (!isClerkConfigured(c)) {
    await next()
    return
  }
  const user = c.get('user')
  if (!isAdmin(user)) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await next()
})

// ===== API: UPDATE APPLICATION STATUS =====
admin.post('/api/admin/applications/:id/status', async (c) => {
  const db = getDb(c.env.DB)
  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.parseBody()

  const action = String(body.action || '')
  const pricingTier = String(body.pricing_tier || 'pending')
  const notes = String(body.notes || '').trim() || null

  if (action !== 'approve' && action !== 'reject') {
    return c.redirect(`/admin/applications/${id}`)
  }

  const status = action === 'approve' ? 'approved' : 'rejected'
  const updateData: Record<string, any> = {
    status,
    pricingTier,
    notes,
  }

  if (status === 'approved') {
    updateData.approvedAt = new Date().toISOString()
  }

  await db
    .update(applications)
    .set(updateData)
    .where(eq(applications.id, id))

  return c.redirect(`/admin/applications/${id}`)
})

// ===== API: CREATE LESSON =====
admin.post('/api/admin/lessons', async (c) => {
  const db = getDb(c.env.DB)
  const body = await c.req.parseBody()

  const cohortId = parseInt(String(body.cohort_id), 10)
  const weekNumber = parseInt(String(body.week_number), 10)
  const title = String(body.title || '').trim()
  const description = String(body.description || '').trim() || null
  const date = String(body.date || '').trim() || null
  const contentMarkdown = String(body.content_markdown || '')
  const status = String(body.status || 'draft')

  if (!title || isNaN(cohortId) || isNaN(weekNumber)) {
    return c.redirect('/admin/lessons/new')
  }

  const result = await db
    .insert(lessons)
    .values({
      cohortId,
      weekNumber,
      title,
      description,
      date,
      contentMarkdown,
      status,
      sortOrder: weekNumber,
    })
    .returning()

  return c.redirect(`/admin/lessons/${result[0].id}/edit`)
})

// ===== API: UPDATE LESSON =====
admin.post('/api/admin/lessons/:id', async (c) => {
  const db = getDb(c.env.DB)
  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.parseBody()

  const cohortId = parseInt(String(body.cohort_id), 10)
  const weekNumber = parseInt(String(body.week_number), 10)
  const title = String(body.title || '').trim()
  const description = String(body.description || '').trim() || null
  const date = String(body.date || '').trim() || null
  const contentMarkdown = String(body.content_markdown || '')
  const status = String(body.status || 'draft')

  await db
    .update(lessons)
    .set({
      cohortId,
      weekNumber,
      title,
      description,
      date,
      contentMarkdown,
      status,
      sortOrder: weekNumber,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(lessons.id, id))

  return c.redirect(`/admin/lessons/${id}/edit`)
})

export default admin
