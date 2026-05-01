import { Hono } from 'hono'
import { eq, desc, asc, and, gte, lte, like, or, ne, inArray } from 'drizzle-orm'
import { Layout } from '../components/Layout'
import { getDb } from '../db'
import { applications, cohorts, lessons, users, enrollments, payments, feedback, emailLog, lessonProgress, projects, discussions, comments, apiKeys, memberships } from '../db/schema'
import { isAdmin, isClerkConfigured, generateToken } from '../lib/auth'
import { formatCents, getAmountForTier, getTierLabel, getApplicationAmount, getApplicationLabel } from '../lib/stripe'
import { sendBroadcast, sendApplicationApproved, sendApplicationRejected, sendApplicationPriceChanged, sendEmail, isEmailConfigured, type BroadcastAudience, applicationReceivedEmail, applicationApprovedEmail, applicationRejectedEmail, applicationPriceChangedEmail, enrollmentConfirmedEmail, cohortBroadcastEmail } from '../lib/email'
import { enrollUserAndNotify, findUserByEmail } from '../lib/enrollment'
import { isStripeConfigured, getStripe } from '../lib/stripe'
import { renderMarkdown } from '../lib/markdown'
import type { AppContext } from '../types'

const admin = new Hono<AppContext>()

// ===== ADMIN GUARD =====
// When Clerk is configured: require admin role
// When Clerk is NOT configured (dev): allow access for development
admin.use('/admin/*', async (c, next) => {
  const user = c.get('user')

  // Dev bypass — only on localhost AND without Clerk. Prevents production
  // from accidentally running admin without auth if Clerk vars get cleared.
  if (!isClerkConfigured(c)) {
    const hostname = new URL(c.req.url).hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      await next()
      return
    }
    return c.text('Admin not available — auth not configured.', 503)
  }

  // If not logged in, redirect to sign-in (don't show 403 for transient auth failures)
  if (!user) {
    return c.redirect('/sign-in')
  }

  // In production, require admin role
  if (!isAdmin(user)) {
    return c.html(
      <Layout title="Unauthorized" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY}>
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

  const [allApps, allLessons, cohortList, feedbackList, allUsers, allEmails, allPayments, allEnrollments] = await Promise.all([
    db.select().from(applications).all(),
    db.select().from(lessons).all(),
    db.select().from(cohorts).orderBy(asc(cohorts.id)).all(),
    db.select().from(feedback).all(),
    db.select().from(users).all(),
    db.select().from(emailLog).all(),
    db.select().from(payments).where(eq(payments.status, 'completed')).all(),
    db.select().from(enrollments).all(),
  ])

  const pendingApps = allApps.filter(a => a.status === 'pending').length
  const approvedApps = allApps.filter(a => a.status === 'approved').length
  const enrolledApps = allApps.filter(a => a.status === 'enrolled').length
  const rejectedApps = allApps.filter(a => a.status === 'rejected').length
  const totalRevenue = allPayments.reduce((sum, p) => sum + p.amountCents, 0)
  const conversionRate = allApps.length > 0 ? Math.round((enrolledApps / allApps.length) * 100) : 0

  return c.html(
    <Layout title="Admin Dashboard" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} noindex>
      <div class="page-section" style="max-width: 900px; margin: 0 auto;">
        <p class="section-label">Admin</p>
        <h2>Dashboard</h2>

        {/* Funnel metrics */}
        <div style="margin-top: 2rem; padding: 1.5rem; background: var(--surface); border-radius: 10px;">
          <h3 style="font-family: var(--font-display); font-size: 1rem; margin-bottom: 1rem; color: var(--text-secondary);">Application Funnel</h3>
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <div style="text-align: center; flex: 1; min-width: 80px;">
              <div style="font-size: 1.5rem; font-weight: 600;">{allApps.length}</div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary);">Applied</div>
            </div>
            <div style="color: var(--text-tertiary);">→</div>
            <div style="text-align: center; flex: 1; min-width: 80px;">
              <div style="font-size: 1.5rem; font-weight: 600; color: #f59e0b;">{pendingApps}</div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary);">Pending</div>
            </div>
            <div style="color: var(--text-tertiary);">→</div>
            <div style="text-align: center; flex: 1; min-width: 80px;">
              <div style="font-size: 1.5rem; font-weight: 600; color: #16a34a;">{approvedApps}</div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary);">Approved</div>
            </div>
            <div style="color: var(--text-tertiary);">→</div>
            <div style="text-align: center; flex: 1; min-width: 80px;">
              <div style="font-size: 1.5rem; font-weight: 600; color: #1e40af;">{enrolledApps}</div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary);">Enrolled</div>
            </div>
            <div style="text-align: center; flex: 1; min-width: 80px;">
              <div style="font-size: 1.5rem; font-weight: 600; color: #dc2626;">{rejectedApps}</div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary);">Rejected</div>
            </div>
          </div>
        </div>

        {/* Key metrics */}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1.5rem;">
          <div class="admin-stat-card">
            <span class="admin-stat-number" style="color: #16a34a;">{formatCents(totalRevenue)}</span>
            <span class="admin-stat-label">Revenue</span>
            <span style="font-size: 0.8rem; color: var(--text-tertiary);">{allPayments.length} payments</span>
          </div>
          <a href="/admin/accounts" class="admin-stat-card">
            <span class="admin-stat-number">{allUsers.length}</span>
            <span class="admin-stat-label">Accounts</span>
            <span style="font-size: 0.8rem; color: var(--text-tertiary);">{allEnrollments.length} enrolled</span>
          </a>
          <a href="/admin/lessons" class="admin-stat-card">
            <span class="admin-stat-number">{allLessons.length}</span>
            <span class="admin-stat-label">Lessons</span>
          </a>
          <a href="/admin/feedback" class="admin-stat-card">
            <span class="admin-stat-number">{feedbackList.length}</span>
            <span class="admin-stat-label">Feedback</span>
          </a>
          <a href="/admin/emails" class="admin-stat-card">
            <span class="admin-stat-number">{allEmails.length}</span>
            <span class="admin-stat-label">Emails Sent</span>
          </a>
          <div class="admin-stat-card">
            <span class="admin-stat-number">{conversionRate}%</span>
            <span class="admin-stat-label">Conversion</span>
            <span style="font-size: 0.8rem; color: var(--text-tertiary);">apply → enroll</span>
          </div>
        </div>

        <div style="margin-top: 2.5rem;">
          <h3 style="font-family: var(--font-display); margin-bottom: 1rem;">Quick Actions</h3>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <a href="/admin/applications?status=pending" class="admin-action-btn">Review Pending ({pendingApps})</a>
            <a href="/admin/accounts" class="admin-action-btn">All Accounts</a>
            <a href="/admin/lessons" class="admin-action-btn">Manage Lessons</a>
            <a href="/admin/email" class="admin-action-btn">Send Email</a>
            <a href="/admin/emails" class="admin-action-btn">Email Log</a>
            <a href="/admin/feedback" class="admin-action-btn">View Feedback</a>
          </div>
        </div>

        <div style="margin-top: 2.5rem;">
          <h3 style="font-family: var(--font-display); margin-bottom: 1rem;">Cohorts</h3>
          {cohortList.map(cohort => {
            const cohortEnrollments = allEnrollments.filter(e => e.cohortId === cohort.id)
            return (
              <div style="padding: 1rem; background: var(--surface); border-radius: 8px; margin-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong>{cohort.title}</strong>
                    <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-tertiary); margin-left: 0.75rem;">
                      {cohort.slug} · {cohort.status} · {cohort.isPublic ? 'Public' : 'Gated'}
                    </span>
                  </div>
                  <span style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-secondary);">
                    {cohortEnrollments.length} enrolled
                  </span>
                </div>
                <form method="post" action={`/api/admin/cohorts/${cohort.id}/meeting-url`} style="display: flex; gap: 0.5rem; margin-top: 0.75rem; align-items: center;">
                  <label style="font-size: 0.8rem; color: var(--text-tertiary); white-space: nowrap;">Live session link:</label>
                  <input
                    type="url"
                    name="meeting_url"
                    value={cohort.meetingUrl || ''}
                    placeholder="https://zoom.us/j/…"
                    style="flex: 1; padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: 4px; font-size: 0.85rem; font-family: var(--font-mono);"
                  />
                  <button type="submit" style="padding: 0.4rem 0.85rem; background: var(--accent); color: white; border: none; border-radius: 4px; font-size: 0.85rem; cursor: pointer;">
                    Save
                  </button>
                </form>
              </div>
            )
          })}
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
  const search = c.req.query('q')?.trim() || ''

  let allApps = await db.select().from(applications).orderBy(desc(applications.createdAt)).all()

  // Diagnostic signals per application: does the applicant have a Clerk
  // account, and do they have an enrollments row? Helps admin spot stuck
  // cases at a glance ("they paid but have no account yet", etc.).
  const appEmails = allApps.map(a => a.email.toLowerCase())
  const userRows = appEmails.length > 0
    ? await db.select({ email: users.email, id: users.id })
        .from(users)
        .where(inArray(users.email, appEmails))
        .all()
    : []
  const userByEmail = new Map(userRows.map(u => [u.email.toLowerCase(), u.id]))
  const enrollmentRows = userRows.length > 0
    ? await db.select({ userId: enrollments.userId })
        .from(enrollments)
        .where(and(
          inArray(enrollments.userId, userRows.map(u => u.id)),
          ne(enrollments.status, 'dropped'),
        ))
        .all()
    : []
  const enrolledUserIds = new Set(enrollmentRows.map(e => e.userId))

  if (statusFilter !== 'all') {
    allApps = allApps.filter(a => a.status === statusFilter)
  }
  if (search) {
    const q = search.toLowerCase()
    allApps = allApps.filter(a =>
      a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.background.toLowerCase().includes(q)
    )
  }

  return c.html(
    <Layout title="Applications" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} noindex>
      <div class="page-section" style="max-width: 900px; margin: 0 auto;">
        <a href="/admin" class="back-link">← Admin</a>
        <p class="section-label">Applications</p>
        <h2>Applications ({allApps.length})</h2>

        {/* Search */}
        <form method="get" action="/admin/applications" style="margin-top: 1.5rem;">
          {statusFilter !== 'all' && <input type="hidden" name="status" value={statusFilter} />}
          <input type="text" name="q" value={search} placeholder="Search by name, email, or background..."
            style="width: 100%; padding: 0.6rem 1rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem;" />
        </form>

        {/* Status filters */}
        <div style="margin: 1rem 0; display: flex; gap: 0.5rem; flex-wrap: wrap;">
          {['all', 'pending', 'approved', 'enrolled', 'rejected'].map(status => (
            <a
              href={`/admin/applications${status === 'all' ? '' : `?status=${status}`}${search ? `${status === 'all' ? '?' : '&'}q=${encodeURIComponent(search)}` : ''}`}
              style={`padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.85rem; text-decoration: none; ${statusFilter === status ? 'background: var(--accent); color: white;' : 'background: var(--surface); color: var(--text-secondary);'}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </a>
          ))}
        </div>

        {/* Bulk actions for pending apps */}
        {statusFilter === 'pending' && allApps.length > 0 && (
          <div style="margin-bottom: 1rem; padding: 1rem; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
            <span style="font-size: 0.85rem; color: #92400e; font-weight: 500;">Bulk actions:</span>
            <form method="post" action="/api/admin/applications/bulk" style="display: flex; gap: 0.5rem; align-items: center;">
              <input type="hidden" name="ids" value={allApps.map(a => a.id).join(',')} />
              <select name="pricing_tier" style="padding: 0.4rem 0.75rem; border: 1px solid var(--border); border-radius: 4px; font-size: 0.85rem;">
                <option value="standard">Full Price ($500)</option>
                <option value="discounted">Discounted ($250)</option>
                <option value="sponsor">Sponsored ($0)</option>
              </select>
              <button type="submit" name="action" value="approve" style="padding: 0.4rem 1rem; background: #16a34a; color: white; border: none; border-radius: 4px; font-size: 0.85rem; cursor: pointer;">
                Approve All ({allApps.length})
              </button>
              <button type="submit" name="action" value="reject" style="padding: 0.4rem 1rem; background: #dc2626; color: white; border: none; border-radius: 4px; font-size: 0.85rem; cursor: pointer;"
                onclick="return confirm('Reject all listed applications?')">
                Reject All
              </button>
            </form>
          </div>
        )}

        {allApps.length === 0 ? (
          <p style="color: var(--text-tertiary); margin-top: 2rem;">No applications found.</p>
        ) : (
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            {allApps.map(app => {
              const userId = userByEmail.get(app.email.toLowerCase())
              const hasAccount = !!userId
              const hasEnrollment = userId ? enrolledUserIds.has(userId) : false
              // Signal *only* when there's an actionable mismatch — quiet
              // badges for the happy path, loud ones when something's stuck.
              const isStuck = (app.status === 'enrolled' || (app.status === 'approved' && app.approvedAmountCents === 0))
                && !hasAccount
              const isInconsistent = app.status === 'enrolled' && hasAccount && !hasEnrollment
              return (
              <a href={`/admin/applications/${app.id}`} class="admin-app-card">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div>
                    <strong>{app.name}</strong>
                    <span style="font-size: 0.85rem; color: var(--text-tertiary); margin-left: 0.5rem;">{app.email}</span>
                  </div>
                  <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                    {isStuck && (
                      <span title="This applicant needs to sign up before they can access the cohort." style="font-size: 0.7rem; background: #fef9c3; color: #854d0e; border: 1px solid #fde047; border-radius: 999px; padding: 0.15rem 0.55rem; font-weight: 500;">
                        ⏳ No account
                      </span>
                    )}
                    {isInconsistent && (
                      <span title="Status is 'enrolled' but no enrollment row exists — data inconsistency." style="font-size: 0.7rem; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; border-radius: 999px; padding: 0.15rem 0.55rem; font-weight: 500;">
                        ⚠ Orphan enrollment
                      </span>
                    )}
                    {app.requestedAmountCents != null && (
                      app.requestedAmountCents === 50000 && !app.requestedAmountReason ? (
                        <span style="font-size: 0.75rem; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 999px; padding: 0.15rem 0.55rem; font-weight: 500;">
                          ✓ {formatCents(app.requestedAmountCents)}
                        </span>
                      ) : (
                        <span style="font-size: 0.75rem; background: #fef9c3; color: #854d0e; border: 1px solid #fde047; border-radius: 999px; padding: 0.15rem 0.55rem; font-weight: 500;">
                          💭 {formatCents(app.requestedAmountCents)}
                        </span>
                      )
                    )}
                    {app.pricingTier !== 'pending' && (
                      <span style="font-size: 0.75rem; color: var(--text-tertiary);">{getTierLabel(app.pricingTier)}</span>
                    )}
                    <span class={`badge badge-${app.status === 'approved' || app.status === 'enrolled' ? 'active' : app.status === 'rejected' ? 'completed' : 'pending'}`}>
                      {app.status}
                    </span>
                  </div>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem; line-height: 1.5;">
                  {app.background.length > 150 ? app.background.substring(0, 150) + '...' : app.background}
                </p>
                {app.requestedAmountReason && (
                  <p style="font-size: 0.8rem; color: #713f12; background: #fef9c3; border-left: 3px solid #fde047; padding: 0.4rem 0.65rem; margin-top: 0.5rem; line-height: 1.4; border-radius: 4px; font-style: italic;">
                    {app.requestedAmountReason.length > 180 ? app.requestedAmountReason.substring(0, 180) + '…' : app.requestedAmountReason}
                  </p>
                )}
                <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-tertiary);">
                  {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {app.cohortSlug && <> · {app.cohortSlug}</>}
                </span>
              </a>
              )
            })}
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
      <Layout title="Not Found" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} noindex>
        <div class="page-section" style="text-align: center; padding: 6rem 0;">
          <h2>Application not found</h2>
          <a href="/admin/applications" class="back-link">← Back to applications</a>
        </div>
      </Layout>,
      404
    )
  }

  return c.html(
    <Layout title={`Application: ${app.name}`} user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} noindex>
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

          {app.requestedAmountCents != null && (
            app.requestedAmountCents === 50000 && !app.requestedAmountReason ? (
              <div class="admin-detail-section" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 0.75rem 1.25rem;">
                <p style="margin: 0; color: #166534; font-size: 0.95rem;">
                  ✓ Applicant confirmed full price ($500).
                </p>
              </div>
            ) : (
              <div class="admin-detail-section" style="background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 1rem 1.25rem;">
                <h3 style="font-family: var(--font-display); color: #854d0e; margin: 0 0 0.35rem 0;">
                  💭 Self-selected contribution: {formatCents(app.requestedAmountCents)}
                </h3>
                {app.requestedAmountReason ? (
                  <p style="margin: 0.5rem 0 0 0; color: #713f12; font-size: 0.95rem; white-space: pre-wrap;">{app.requestedAmountReason}</p>
                ) : (
                  <p style="margin: 0.5rem 0 0 0; color: #854d0e; font-size: 0.85rem; font-style: italic;">No reasoning provided.</p>
                )}
              </div>
            )
          )}

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
            <h3 style="font-family: var(--font-display); color: #166534; margin-bottom: 0.75rem;">✓ Approved — {getApplicationLabel(app)}</h3>
            <p style="font-size: 0.9rem; color: #15803d; margin-bottom: 1rem;">
              {getApplicationAmount(app) > 0
                ? `Payment required: ${formatCents(getApplicationAmount(app))}`
                : 'Sponsored — no payment needed'}
            </p>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 0.85rem; color: var(--text-secondary);">Payment link:</span>
                <code style="font-family: var(--font-mono); font-size: 0.8rem; background: white; padding: 0.4rem 0.75rem; border-radius: 4px; border: 1px solid #e5e7eb; word-break: break-all;">
                  {new URL(c.req.url).origin}/payment/checkout/{app.id}{app.paymentToken ? `?t=${app.paymentToken}` : ''}
                </code>
              </div>
              <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                <button
                  onclick={`navigator.clipboard.writeText('${new URL(c.req.url).origin}/payment/checkout/${app.id}${app.paymentToken ? `?t=${app.paymentToken}` : ''}').then(() => this.textContent = 'Copied!')`}
                  style="padding: 0.4rem 1rem; background: #166534; color: white; border: none; border-radius: 6px; font-size: 0.85rem; cursor: pointer;"
                >
                  Copy Payment Link
                </button>
              </div>
            </div>
            {/* Change pricing tier or set custom amount */}
            <form method="post" action={`/api/admin/applications/${app.id}/tier`} style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #bbf7d0; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;" data-tier-sync-form>
              <label style="font-size: 0.85rem; color: #15803d;">Tier:</label>
              <select name="pricing_tier" data-tier-select style="padding: 0.4rem 0.75rem; border: 1px solid #bbf7d0; border-radius: 4px; font-size: 0.85rem; background: white;">
                <option value="standard" selected={app.pricingTier === 'standard'} data-tier-amount="500">Full Price ($500)</option>
                <option value="discounted" selected={app.pricingTier === 'discounted'} data-tier-amount="250">Discounted ($250)</option>
                <option value="sponsor" selected={app.pricingTier === 'sponsor'} data-tier-amount="0">Sponsored ($0)</option>
              </select>
              <label style="font-size: 0.85rem; color: #15803d;">Amount $</label>
              <input
                type="number"
                name="custom_amount_dollars"
                data-amount-input
                min="0"
                step="1"
                placeholder="e.g. 150"
                value={app.approvedAmountCents != null ? String(app.approvedAmountCents / 100) : ''}
                style="padding: 0.4rem 0.5rem; border: 1px solid #bbf7d0; border-radius: 4px; font-size: 0.85rem; background: white; width: 6rem;"
              />
              <label style="display: flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; color: #15803d;">
                <input type="checkbox" name="notify" value="true" checked />
                Email applicant
              </label>
              <button type="submit" style="padding: 0.4rem 1rem; background: #166534; color: white; border: none; border-radius: 4px; font-size: 0.85rem; cursor: pointer;">
                Update
              </button>
            </form>
            <p style="font-size: 0.75rem; color: #15803d; margin-top: 0.5rem; opacity: 0.8;">
              Selecting a tier auto-fills the amount. Type a different amount to override (tier becomes a label, amount is what counts).
            </p>
          </div>
        )}

        {app.status === 'enrolled' && (
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

            <form method="post" action={`/api/admin/applications/${app.id}/status`} style="display: flex; flex-direction: column; gap: 1rem;" data-tier-sync-form>
              <div class="form-group">
                <label for="pricing_tier">Pricing Tier</label>
                <select id="pricing_tier" name="pricing_tier" data-tier-select style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;">
                  <option value="standard" data-tier-amount="500">Full Price ($500)</option>
                  <option value="discounted" data-tier-amount="250">Discounted ($250)</option>
                  <option value="sponsor" data-tier-amount="0">Sponsored ($0)</option>
                </select>
                <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-tertiary);">Selecting a tier auto-fills the amount below. Edit the amount to override.</p>
              </div>

              <div class="form-group">
                <label for="custom_amount_dollars">Amount ($)</label>
                <input
                  type="number"
                  id="custom_amount_dollars"
                  name="custom_amount_dollars"
                  data-amount-input
                  min="0"
                  step="1"
                  placeholder="e.g. 150"
                  value={app.requestedAmountCents != null ? String(app.requestedAmountCents / 100) : '500'}
                  style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;"
                />
                {app.requestedAmountCents != null && (
                  <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #854d0e;">Pre-filled with applicant's self-selected contribution (${app.requestedAmountCents / 100}). Adjust if you want to honor a different amount.</p>
                )}
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

        {/* Admin actions: email + delete */}
        <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border); display: flex; gap: 1rem; flex-wrap: wrap;">
          <a href={`/admin/email/compose?to=${encodeURIComponent(app.email)}&name=${encodeURIComponent(app.name)}`}
            style="padding: 0.5rem 1rem; background: var(--surface); border-radius: 6px; text-decoration: none; color: var(--text); font-size: 0.85rem; font-weight: 500;">
            Email {app.name.split(' ')[0]} →
          </a>
          <form method="post" action={`/api/admin/applications/${app.id}/delete`} style="margin-left: auto;"
            onsubmit={`return confirm('Delete application from ${app.name}? This cannot be undone.')`}>
            <button type="submit" style="padding: 0.5rem 1rem; background: none; border: 1px solid #fca5a5; border-radius: 6px; color: #dc2626; font-size: 0.85rem; cursor: pointer;">
              Delete Application
            </button>
          </form>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `
        // Tier <-> amount sync: when admin picks a tier, fill the amount
        // with the tier's default. Prevents the tier-amount mismatch that
        // caused stale "Pay $100" emails to sponsored applicants.
        document.querySelectorAll('[data-tier-sync-form]').forEach(function(form) {
          var sel = form.querySelector('[data-tier-select]');
          var input = form.querySelector('[data-amount-input]');
          if (!sel || !input) return;
          sel.addEventListener('change', function() {
            var opt = sel.options[sel.selectedIndex];
            var amount = opt && opt.getAttribute('data-tier-amount');
            if (amount !== null && amount !== undefined) {
              input.value = amount;
            }
          });
        });
      ` }} />
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
    <Layout title="Manage Lessons" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} noindex>
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
    <Layout title="New Lesson" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} noindex>
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
      <Layout title="Not Found" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} noindex>
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
    <Layout title={`Edit: ${lesson.title}`} user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} noindex>
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
            <label for="recording_url">Recording URL (optional)</label>
            <input
              type="url"
              id="recording_url"
              name="recording_url"
              value={lesson.recordingUrl || ''}
              placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;"
            />
            <p style="margin-top: 0.4rem; font-size: 0.8rem; color: var(--text-tertiary);">
              YouTube URLs auto-embed. Other URLs render as a "Watch recording" link.
            </p>
          </div>

          <div class="form-group">
            <label for="transcript_markdown">Transcript (optional)</label>
            <textarea
              id="transcript_markdown"
              name="transcript_markdown"
              rows={10}
              placeholder="Paste the session transcript here. Markdown supported. Renders in a collapsible section below the lesson."
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-family: var(--font-mono); font-size: 0.85rem; line-height: 1.6;"
            >{lesson.transcriptMarkdown || ''}</textarea>
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

// ===== FEEDBACK LIST =====
admin.get('/admin/feedback', async (c) => {
  const user = c.get('user')!
  const db = getDb(c.env.DB)

  const allFeedback = await db.select().from(feedback).orderBy(desc(feedback.createdAt)).all()

  const featureLabels: Record<number, string> = {
    0: 'Private',
    1: 'Named + linked',
    2: 'Anonymous',
    3: 'First name only',
  }

  return c.html(
    <Layout title="Feedback" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} noindex>
      <div class="page-section" style="max-width: 900px; margin: 0 auto;">
        <p class="section-label">Admin</p>
        <h2>Feedback ({allFeedback.length})</h2>
        <p style="margin-top: 0.5rem; color: var(--text-secondary);">
          <a href="/admin" style="color: var(--text-tertiary);">← Back to Admin</a>
        </p>

        {allFeedback.length === 0 ? (
          <div style="margin-top: 3rem; text-align: center; color: var(--text-tertiary);">
            No feedback yet. Share the form: <a href="/feedback" style="color: var(--accent);">/feedback</a>
          </div>
        ) : (
          <div style="margin-top: 2rem; display: flex; flex-direction: column; gap: 1.5rem;">
            {allFeedback.map(fb => (
              <div style="padding: 1.5rem; background: var(--surface); border-radius: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                  <div>
                    <strong style="font-size: 1.05rem;">{fb.name}</strong>
                    <span style="color: var(--text-tertiary); font-size: 0.85rem; margin-left: 0.5rem;">{fb.email}</span>
                  </div>
                  <div style="display: flex; gap: 0.5rem; align-items: center;">
                    {fb.rating && (
                      <span style="font-family: var(--font-mono); font-size: 0.85rem; background: var(--accent-soft); color: var(--accent); padding: 0.25rem 0.5rem; border-radius: 4px;">
                        {fb.rating}/5
                      </span>
                    )}
                    <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-tertiary);">
                      {fb.cohortSlug || 'n/a'}
                    </span>
                  </div>
                </div>

                {fb.highlight && (
                  <div style="margin-bottom: 1rem;">
                    <span style="font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em;">Best part</span>
                    <p style="margin-top: 0.25rem; color: var(--text-secondary); line-height: 1.6;">{fb.highlight}</p>
                  </div>
                )}

                {fb.testimonial && (
                  <div style="margin-bottom: 1rem; padding: 1rem; background: var(--white); border-radius: 8px; border-left: 3px solid var(--accent);">
                    <span style="font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em;">
                      Testimonial · {featureLabels[fb.canFeature] || 'Private'}
                    </span>
                    <p style="margin-top: 0.25rem; font-style: italic; color: var(--text); line-height: 1.6;">"{fb.testimonial}"</p>
                    {fb.website && (
                      <p style="margin-top: 0.5rem; font-size: 0.85rem;">
                        <a href={fb.website} target="_blank" style="color: var(--accent);">{fb.website}</a>
                      </p>
                    )}
                  </div>
                )}

                {fb.improvement && (
                  <div style="margin-bottom: 0.5rem;">
                    <span style="font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em;">Could be better</span>
                    <p style="margin-top: 0.25rem; color: var(--text-secondary); line-height: 1.6;">{fb.improvement}</p>
                  </div>
                )}

                <div style="margin-top: 0.75rem; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-tertiary);">
                  {new Date(fb.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
})

// ===== ALL ACCOUNTS =====
admin.get('/admin/accounts', async (c) => {
  const user = c.get('user')!
  const db = getDb(c.env.DB)
  const search = c.req.query('q')?.trim() || ''
  const roleFilter = c.req.query('role') || 'all'

  let allUsers = await db.select().from(users).orderBy(desc(users.createdAt)).all()

  if (roleFilter !== 'all') {
    allUsers = allUsers.filter(u => u.role === roleFilter)
  }
  if (search) {
    const q = search.toLowerCase()
    allUsers = allUsers.filter(u =>
      (u.name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }

  // Get application and payment data for each user
  const allApps = await db.select().from(applications).all()
  const allPayments = await db.select().from(payments).where(eq(payments.status, 'completed')).all()
  const allEnrollments = await db.select().from(enrollments).all()

  const appByEmail = new Map(allApps.map(a => [a.email.toLowerCase(), a]))
  const paymentByUserId = new Map(allPayments.map(p => [p.userId, p]))
  const enrollmentsByUserId = new Map<number, typeof allEnrollments>()
  for (const e of allEnrollments) {
    const list = enrollmentsByUserId.get(e.userId) || []
    list.push(e)
    enrollmentsByUserId.set(e.userId, list)
  }

  const thStyle = "padding: 0.75rem 0.5rem; font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em;"

  return c.html(
    <Layout title="All Accounts" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} noindex>
      <div class="page-section" style="max-width: 1100px; margin: 0 auto;">
        <a href="/admin" class="back-link">← Admin</a>
        <p class="section-label">Accounts</p>
        <h2>All Accounts ({allUsers.length})</h2>

        {/* Search */}
        <form method="get" action="/admin/accounts" style="margin-top: 1.5rem;">
          {roleFilter !== 'all' && <input type="hidden" name="role" value={roleFilter} />}
          <input type="text" name="q" value={search} placeholder="Search by name or email..."
            style="width: 100%; padding: 0.6rem 1rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem;" />
        </form>

        {/* Role filter */}
        <div style="margin: 1rem 0; display: flex; gap: 0.5rem; flex-wrap: wrap;">
          {['all', 'student', 'admin', 'facilitator', 'alumni'].map(role => (
            <a
              href={`/admin/accounts${role === 'all' ? '' : `?role=${role}`}${search ? `${role === 'all' ? '?' : '&'}q=${encodeURIComponent(search)}` : ''}`}
              style={`padding: 0.4rem 0.75rem; border-radius: 20px; font-size: 0.85rem; text-decoration: none; ${roleFilter === role ? 'background: var(--accent); color: white;' : 'background: var(--surface); color: var(--text-secondary);'}`}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </a>
          ))}
        </div>

        <div style="margin-top: 1rem; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border); text-align: left;">
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Application</th>
                <th style={thStyle}>Payment</th>
                <th style={thStyle}>Enrolled</th>
                <th style={thStyle}>Signed Up</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map(u => {
                const app = appByEmail.get(u.email.toLowerCase())
                const payment = paymentByUserId.get(u.id)
                const userEnrollments = enrollmentsByUserId.get(u.id) || []

                return (
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 0.75rem 0.5rem;">
                      <a href={`/admin/accounts/${u.id}`} style="color: var(--text); font-weight: 500; text-decoration: none;">
                        {u.name || '—'}
                      </a>
                    </td>
                    <td style="padding: 0.75rem 0.5rem; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-secondary);">
                      {u.email}
                    </td>
                    <td style="padding: 0.75rem 0.5rem;">
                      <span class={`badge badge-${u.role === 'admin' || u.role === 'facilitator' ? 'active' : u.role === 'deleted' ? 'completed' : 'pending'}`} style="font-size: 0.75rem;">
                        {u.role}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 0.5rem;">
                      {app ? (
                        <a href={`/admin/applications/${app.id}`} style="text-decoration: none;">
                          <span class={`badge badge-${app.status === 'approved' || app.status === 'enrolled' ? 'active' : app.status === 'rejected' ? 'completed' : 'pending'}`} style="font-size: 0.75rem;">
                            {app.status}
                          </span>
                        </a>
                      ) : (
                        <span style="color: var(--text-tertiary); font-size: 0.8rem;">—</span>
                      )}
                    </td>
                    <td style="padding: 0.75rem 0.5rem;">
                      {payment ? (
                        <span style="font-family: var(--font-mono); font-size: 0.8rem; color: #16a34a;">
                          {formatCents(payment.amountCents)}
                        </span>
                      ) : (
                        <span style="color: var(--text-tertiary); font-size: 0.8rem;">—</span>
                      )}
                    </td>
                    <td style="padding: 0.75rem 0.5rem;">
                      {userEnrollments.length > 0 ? (
                        <span style="font-size: 0.8rem; color: #16a34a; font-weight: 500;">
                          {userEnrollments.length}
                        </span>
                      ) : (
                        <span style="color: var(--text-tertiary); font-size: 0.8rem;">—</span>
                      )}
                    </td>
                    <td style="padding: 0.75rem 0.5rem; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-tertiary);">
                      {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td style="padding: 0.75rem 0.5rem;">
                      <div style="display: flex; gap: 0.25rem;">
                        <a href={`/admin/accounts/${u.id}`} style="font-size: 0.8rem; color: var(--accent); text-decoration: none;">Edit</a>
                        <span style="color: var(--text-tertiary); font-size: 0.8rem;">·</span>
                        <a href={`/admin/email/compose?to=${encodeURIComponent(u.email)}&name=${encodeURIComponent(u.name || '')}`}
                          style="font-size: 0.8rem; color: var(--accent); text-decoration: none;">Email</a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
})

// ===== ACCOUNT DETAIL / EDIT =====
admin.get('/admin/accounts/:id', async (c) => {
  const currentUser = c.get('user')!
  const db = getDb(c.env.DB)
  const id = parseInt(c.req.param('id'), 10)
  const saved = c.req.query('saved')
  const error = c.req.query('error')

  const account = await db.select().from(users).where(eq(users.id, id)).get()
  if (!account) {
    return c.html(
      <Layout title="Not Found" user={currentUser} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} noindex>
        <div class="page-section" style="text-align: center; padding: 6rem 0;">
          <h2>Account not found</h2>
          <a href="/admin/accounts" class="back-link">← Back to accounts</a>
        </div>
      </Layout>,
      404
    )
  }

  const userEnrollments = await db
    .select({ enrollment: enrollments, cohort: cohorts })
    .from(enrollments)
    .innerJoin(cohorts, eq(enrollments.cohortId, cohorts.id))
    .where(eq(enrollments.userId, id))
    .all()

  const userPayments = await db.select().from(payments).where(eq(payments.userId, id)).all()

  return c.html(
    <Layout title={`Account: ${account.name || account.email}`} user={currentUser} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} noindex>
      <div class="page-section" style="max-width: 700px; margin: 0 auto;">
        <a href="/admin/accounts" class="back-link">← All Accounts</a>

        {saved === 'true' && (
          <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; font-size: 0.9rem; color: #155724;">
            Account updated.
          </div>
        )}

        {error === 'self_delete' && (
          <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; font-size: 0.9rem; color: #721c24;">
            You cannot delete your own account.
          </div>
        )}

        {error === 'email_taken' && (
          <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; font-size: 0.9rem; color: #721c24;">
            That email address is already in use by another account.
          </div>
        )}

        <div style="margin-top: 1.5rem;">
          <h2>{account.name || 'Unnamed Account'}</h2>
          <p style="color: var(--text-secondary);">{account.email}</p>
        </div>

        {/* Edit form */}
        <form method="post" action={`/api/admin/accounts/${id}`} style="margin-top: 2rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label for="name">Name</label>
              <input type="text" id="name" name="name" value={account.name || ''} style="width: 100%; padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.95rem;" />
            </div>
            <div class="form-group">
              <label for="role">Role</label>
              <select id="role" name="role" style="width: 100%; padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.95rem;">
                {['student', 'alumni', 'facilitator', 'admin'].map(r => (
                  <option value={r} selected={account.role === r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" value={account.email} style="width: 100%; padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.95rem;" />
          </div>
          <div class="form-group">
            <label for="bio">Bio</label>
            <textarea id="bio" name="bio" rows={3} style="width: 100%; padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.95rem;">{account.bio || ''}</textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label for="location">Location</label>
              <input type="text" id="location" name="location" value={account.location || ''} style="width: 100%; padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.95rem;" />
            </div>
            <div class="form-group">
              <label for="website">Website</label>
              <input type="text" id="website" name="website" value={account.website || ''} style="width: 100%; padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.95rem;" />
            </div>
          </div>
          <button type="submit" class="apply-btn">Save Changes</button>
        </form>

        {/* Enrollments */}
        {userEnrollments.length > 0 && (
          <div style="margin-top: 2rem;">
            <h3 style="font-family: var(--font-display); margin-bottom: 0.75rem;">Enrollments</h3>
            {userEnrollments.map(({ enrollment, cohort }) => (
              <div style="padding: 0.75rem; background: var(--surface); border-radius: 8px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                <span>{cohort.title}</span>
                <span class={`badge badge-${enrollment.status === 'active' ? 'active' : 'completed'}`} style="font-size: 0.75rem;">{enrollment.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Payments */}
        {userPayments.length > 0 && (
          <div style="margin-top: 2rem;">
            <h3 style="font-family: var(--font-display); margin-bottom: 0.75rem;">Payments</h3>
            {userPayments.map(p => (
              <div style="padding: 0.75rem; background: var(--surface); border-radius: 8px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-family: var(--font-mono); font-size: 0.85rem;">{formatCents(p.amountCents)}</span>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                  <span class={`badge badge-${p.status === 'completed' ? 'active' : 'pending'}`} style="font-size: 0.75rem;">{p.status}</span>
                  <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-tertiary);">{p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Danger zone */}
        <div style="margin-top: 3rem; padding: 1.5rem; border: 1px solid #fca5a5; border-radius: 10px;">
          <h3 style="font-family: var(--font-display); color: #dc2626; margin-bottom: 0.5rem;">Danger Zone</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
            Deleting this account will remove the user and all their associated data (enrollments, progress, projects, discussions, comments, API keys).
          </p>
          <form method="post" action={`/api/admin/accounts/${id}/delete`}
            onsubmit={`return confirm('Permanently delete ${account.name || account.email}? This deletes all their data and cannot be undone.')`}>
            <button type="submit" style="padding: 0.5rem 1.5rem; background: #dc2626; color: white; border: none; border-radius: 6px; font-size: 0.9rem; cursor: pointer;">
              Delete Account
            </button>
          </form>
        </div>

        <div style="margin-top: 2rem; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-tertiary);">
          ID: {account.id} · Clerk: {account.clerkId} · Created: {account.createdAt}
        </div>
      </div>
    </Layout>
  )
})

// ===== EMAIL LOG =====
admin.get('/admin/emails', async (c) => {
  const user = c.get('user')!
  const db = getDb(c.env.DB)

  const templateLabels: Record<string, string> = {
    application_received: 'App Received',
    application_approved: 'Approved',
    application_approved_sponsored: 'Approved (Sponsored)',
    application_rejected: 'Rejected',
    enrollment_confirmed: 'Enrollment',
    broadcast: 'Broadcast',
  }
  const statusLabels: Record<string, string> = { sent: 'Sent', failed: 'Failed' }
  const ROW_LIMIT = 500

  // ===== Filters =====
  // Read query params and build a drizzle where-clause stack. URL is the
  // source of truth so admin can bookmark common views (e.g. ?status=failed).
  // Date inputs are HTML5 yyyy-mm-dd strings; we compare against ISO sent_at
  // strings, which sort lexicographically. The "to" date is interpreted as
  // end-of-day so a single-day range works as expected.
  const fTemplate = (c.req.query('template') || '').trim()
  const fStatus = (c.req.query('status') || '').trim()
  const fFrom = (c.req.query('from') || '').trim()
  const fTo = (c.req.query('to') || '').trim()
  const fQ = (c.req.query('q') || '').trim()

  const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

  const conds: any[] = []
  if (fTemplate && templateLabels[fTemplate]) conds.push(eq(emailLog.template, fTemplate))
  if (fStatus === 'sent' || fStatus === 'failed') conds.push(eq(emailLog.status, fStatus))
  if (isValidDate(fFrom)) conds.push(gte(emailLog.sentAt, `${fFrom}T00:00:00.000Z`))
  if (isValidDate(fTo)) conds.push(lte(emailLog.sentAt, `${fTo}T23:59:59.999Z`))
  if (fQ) {
    // %escape the LIKE wildcards the user typed (defensive — just in case).
    const safe = fQ.replace(/[\\%_]/g, '\\$&').toLowerCase()
    conds.push(like(emailLog.to, `%${safe}%`))
  }
  const filtersActive = conds.length > 0

  const baseQuery = filtersActive
    ? db.select().from(emailLog).where(and(...conds))
    : db.select().from(emailLog)
  const logs = await baseQuery.orderBy(desc(emailLog.sentAt)).limit(ROW_LIMIT).all()
  const limitHit = logs.length >= ROW_LIMIT

  return c.html(
    <Layout title="Email Log" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} noindex>
      <div class="page-section" style="max-width: 1000px; margin: 0 auto;">
        <a href="/admin" class="back-link">← Admin</a>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p class="section-label">Emails</p>
            <h2>Email Log</h2>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <a href="/admin/email/preview" style="display: inline-block; background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 0.55rem 1.1rem; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 0.9rem;">
              Preview Templates
            </a>
            <a href="/admin/email" style="display: inline-block; background: var(--accent); color: white; padding: 0.6rem 1.25rem; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 0.9rem;">
              Send Email
            </a>
          </div>
        </div>

        {/* Filter form — submits as GET so URL captures the view (bookmarkable). */}
        <form method="get" action="/admin/emails" style="margin-top: 1.75rem; padding: 1rem 1.25rem; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem 1rem; align-items: end;">
          <div style="display: flex; flex-direction: column; gap: 0.3rem;">
            <label for="filter-template" style="font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em;">Template</label>
            <select id="filter-template" name="template" style="padding: 0.45rem 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem; background: var(--white);">
              <option value="">All</option>
              {Object.entries(templateLabels).map(([key, label]) => (
                <option value={key} selected={fTemplate === key}>{label}</option>
              ))}
            </select>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.3rem;">
            <label for="filter-status" style="font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em;">Status</label>
            <select id="filter-status" name="status" style="padding: 0.45rem 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem; background: var(--white);">
              <option value="">All</option>
              <option value="sent" selected={fStatus === 'sent'}>Sent</option>
              <option value="failed" selected={fStatus === 'failed'}>Failed</option>
            </select>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.3rem;">
            <label for="filter-from" style="font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em;">From</label>
            <input id="filter-from" type="date" name="from" value={fFrom} style="padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem; background: var(--white); font-family: inherit;" />
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.3rem;">
            <label for="filter-to" style="font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em;">To</label>
            <input id="filter-to" type="date" name="to" value={fTo} style="padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem; background: var(--white); font-family: inherit;" />
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.3rem; grid-column: span 2;">
            <label for="filter-q" style="font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em;">Recipient contains</label>
            <input id="filter-q" type="text" name="q" value={fQ} placeholder="e.g. @example.com or jane@" style="padding: 0.45rem 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem; background: var(--white); font-family: var(--font-mono);" />
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button type="submit" style="padding: 0.5rem 1rem; background: var(--accent); color: white; border: 0; border-radius: 6px; font-size: 0.9rem; font-weight: 500; cursor: pointer;">Apply</button>
            {filtersActive && (
              <a href="/admin/emails" style="font-size: 0.85rem; color: var(--text-tertiary); text-decoration: none;">Reset</a>
            )}
          </div>
        </form>

        <div style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <span>
            {filtersActive ? <strong>{logs.length}</strong> : logs.length} {logs.length === 1 ? 'match' : 'matches'}
            {filtersActive ? ' for current filters' : ''}{limitHit ? ` (limit ${ROW_LIMIT} reached — narrow filters to see older rows)` : ''}.
          </span>
        </div>

        {logs.length === 0 ? (
          <div style="margin-top: 2rem; padding: 2.5rem 1.5rem; text-align: center; color: var(--text-tertiary); background: var(--surface); border: 1px dashed var(--border); border-radius: 8px;">
            {filtersActive ? (
              <>
                <p style="margin: 0 0 0.5rem 0;">No emails match those filters.</p>
                <p style="margin: 0; font-size: 0.85rem;"><a href="/admin/emails" style="color: var(--accent);">Reset filters</a> to see everything.</p>
              </>
            ) : (
              <p style="margin: 0;">No emails logged yet. Emails sent going forward will appear here.</p>
            )}
          </div>
        ) : (
          <div style="margin-top: 1rem; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border); text-align: left;">
                  <th style="padding: 0.75rem 0.5rem; font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em;">To</th>
                  <th style="padding: 0.75rem 0.5rem; font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em;">Subject</th>
                  <th style="padding: 0.75rem 0.5rem; font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em;">Type</th>
                  <th style="padding: 0.75rem 0.5rem; font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em;">Status</th>
                  <th style="padding: 0.75rem 0.5rem; font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em;">Sent</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 0.75rem 0.5rem; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-secondary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      {log.to}
                    </td>
                    <td style="padding: 0.75rem 0.5rem; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      {log.subject}
                    </td>
                    <td style="padding: 0.75rem 0.5rem;">
                      <span style="font-size: 0.8rem; padding: 0.2rem 0.5rem; background: var(--surface); border-radius: 4px; white-space: nowrap;">
                        {templateLabels[log.template] || log.template}
                      </span>
                    </td>
                    <td style="padding: 0.75rem 0.5rem;">
                      {log.status === 'sent' ? (
                        <span style="color: #16a34a; font-size: 0.85rem;">{statusLabels.sent}</span>
                      ) : (
                        <span style="color: #dc2626; font-size: 0.85rem;" title={log.error || ''}>{statusLabels.failed}</span>
                      )}
                    </td>
                    <td style="padding: 0.75rem 0.5rem; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-tertiary); white-space: nowrap;">
                      {new Date(log.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' '}
                      {new Date(log.sentAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
})

// ===== EMAIL TEMPLATE PREVIEWS =====
// Lets admin see what each auto-email looks like with sample data.
// Answers "I don't know what emails applicants are actually getting."

type PreviewCase = {
  key: string
  label: string
  description: string
  render: () => { subject: string; html: string }
}

const EMAIL_PREVIEW_CASES: PreviewCase[] = [
  {
    key: 'application_received',
    label: 'Application received',
    description: 'Sent immediately when someone submits the apply form.',
    render: () => applicationReceivedEmail('Jane Doe'),
  },
  {
    key: 'application_approved',
    label: 'Approved — paid tier',
    description: 'Sent when admin approves an applicant at a non-zero price.',
    render: () => applicationApprovedEmail(
      'Jane Doe',
      'https://learnvibe.build/payment/checkout/123?t=sample',
      'Full Price',
      '$500',
      false,
    ),
  },
  {
    key: 'application_approved_sponsored',
    label: 'Approved — sponsored ($0)',
    description: 'Sent when admin approves an applicant at $0 AND the applicant has no account yet. (If account exists, they get the enrollment_confirmed email instead.)',
    render: () => applicationApprovedEmail(
      'Jane Doe',
      'https://learnvibe.build/payment/checkout/123?t=sample',
      'Sponsored',
      '$0',
      true,
    ),
  },
  {
    key: 'application_rejected',
    label: 'Rejected',
    description: 'Sent when admin rejects an application.',
    render: () => applicationRejectedEmail('Jane Doe'),
  },
  {
    key: 'application_price_changed_paid',
    label: 'Price changed — paid tier',
    description: 'Sent when admin updates an approved applicant\'s price to a new non-zero amount.',
    render: () => applicationPriceChangedEmail(
      'Jane Doe', '$500', '$250', 'Discounted',
      'https://learnvibe.build/payment/checkout/123?t=sample', false,
    ),
  },
  {
    key: 'application_price_changed_sponsored',
    label: 'Price changed — now sponsored ($0)',
    description: 'Sent when admin moves an approved applicant to sponsored.',
    render: () => applicationPriceChangedEmail(
      'Jane Doe', '$500', '$0', 'Sponsored',
      'https://learnvibe.build/payment/checkout/123?t=sample', true,
    ),
  },
  {
    key: 'enrollment_confirmed_no_account',
    label: 'Enrollment confirmed — no account yet',
    description: 'Sent after successful Stripe payment when the user has not yet signed up. CTA: create account.',
    render: () => enrollmentConfirmedEmail('Jane Doe', 'Cohort 1: Practice', false),
  },
  {
    key: 'enrollment_confirmed_has_account',
    label: 'Enrollment confirmed — account exists',
    description: 'Sent after sponsored auto-enroll or Stripe payment when the user already has an account. CTA: go to dashboard.',
    render: () => enrollmentConfirmedEmail('Jane Doe', 'Cohort 1: Practice', true),
  },
  {
    key: 'broadcast_sample',
    label: 'Broadcast (sample)',
    description: 'Wrapper used for all admin-composed broadcast emails. Body comes from what you type in the composer.',
    render: () => cohortBroadcastEmail(
      'Sample subject',
      '<p>This is the body of a broadcast — admin-composed markdown renders here. The wrapper, footer, and branding are constant.</p>',
      'enrolled',
    ),
  },
]

admin.get('/admin/email/preview', async (c) => {
  const user = c.get('user')!
  return c.html(
    <Layout title="Email Previews" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} noindex>
      <div class="page-section" style="max-width: 900px; margin: 0 auto;">
        <a href="/admin/emails" class="back-link">← Email Log</a>
        <p class="section-label">Emails</p>
        <h2>What each auto-email looks like</h2>
        <p class="lead" style="margin-top: 0.5rem; margin-bottom: 2rem;">
          Sample renders of every auto-email the system sends. Shown with sample
          data ("Jane Doe", "Cohort 1", etc.) so you can see the exact wrapper,
          copy, and CTA applicants receive at each state.
        </p>

        <div style="display: grid; gap: 1rem;">
          {EMAIL_PREVIEW_CASES.map((p) => {
            const tpl = p.render()
            return (
              <div style="padding: 1.5rem; background: var(--surface); border: 1px solid var(--border); border-radius: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; flex-wrap: wrap;">
                  <div>
                    <h3 style="font-family: var(--font-display); font-size: 1.1rem; margin: 0 0 0.25rem 0;">
                      {p.label}
                    </h3>
                    <p style="font-size: 0.85rem; color: var(--text-tertiary); margin: 0;">{p.description}</p>
                  </div>
                  <a
                    href={`/admin/email/preview/${p.key}`}
                    target="_blank"
                    style="padding: 0.4rem 0.85rem; background: var(--accent); color: white; border-radius: 6px; text-decoration: none; font-size: 0.85rem; font-weight: 500; white-space: nowrap;"
                  >
                    Open render ↗
                  </a>
                </div>
                <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: var(--white); border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem;">
                  <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.3rem;">SUBJECT</div>
                  <div style="color: var(--text);">{tpl.subject}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div style="margin-top: 3rem; padding: 1.25rem 1.5rem; background: var(--accent-soft); border: 1px solid #fdd1bb; border-radius: 10px;">
          <p style="margin: 0; font-size: 0.9rem; color: #9a3d12;">
            <strong>Heads up:</strong> these templates are currently defined in code (<code style="background: var(--surface); padding: 0.1rem 0.35rem; border-radius: 4px;">src/lib/email.ts</code>).
            Editing them requires a code change + deploy. Admin-editable templates are on the backlog.
          </p>
        </div>
      </div>
    </Layout>
  )
})

admin.get('/admin/email/preview/:key', async (c) => {
  const key = c.req.param('key')
  const preview = EMAIL_PREVIEW_CASES.find(p => p.key === key)
  if (!preview) {
    return c.text('Preview not found', 404)
  }
  const tpl = preview.render()
  return c.html(tpl.html)
})

// ===== COMPOSE INDIVIDUAL EMAIL =====
admin.get('/admin/email/compose', async (c) => {
  const user = c.get('user')!
  const to = c.req.query('to') || ''
  const name = c.req.query('name') || ''
  const success = c.req.query('success')
  const emailConfigured = isEmailConfigured(c.env.RESEND_API_KEY)

  return c.html(
    <Layout title="Compose Email" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} noindex>
      <div class="page-section" style="max-width: 700px; margin: 0 auto;">
        <a href="/admin" class="back-link">← Admin</a>
        <p class="section-label">Email</p>
        <h2>Compose Email</h2>

        {!emailConfigured && (
          <div style="margin-top: 1rem; padding: 1rem; background: #fef3cd; border: 1px solid #ffc107; border-radius: 8px; font-size: 0.9rem; color: #856404;">
            Email is not configured. Set <code>RESEND_API_KEY</code> to enable sending.
          </div>
        )}

        {success === 'true' && (
          <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; font-size: 0.9rem; color: #155724;">
            Email sent successfully.
          </div>
        )}

        <form method="post" action="/api/admin/email/send" class="apply-form" style="margin-top: 2rem;">
          <div class="form-group">
            <label for="to">To</label>
            <input type="email" id="to" name="to" required value={to} placeholder="recipient@example.com"
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;" />
          </div>

          <div class="form-group">
            <label for="subject">Subject</label>
            <input type="text" id="subject" name="subject" required placeholder="Subject line"
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;" />
          </div>

          <div class="form-group">
            <label for="body_markdown">Message (Markdown)</label>
            <textarea id="body_markdown" name="body_markdown" rows={12} required
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-family: var(--font-mono); font-size: 0.9rem; line-height: 1.6;"
              placeholder={name ? `Hi ${name.split(' ')[0]},\n\n` : 'Write your message in markdown...'}
            ></textarea>
          </div>

          <button type="submit" class="apply-btn">Send Email</button>
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
  const failedEmailsParam = c.req.query('failed_emails') || ''
  const failedEmails = failedEmailsParam ? failedEmailsParam.split(',').filter(Boolean) : []
  const errorCode = c.req.query('error') || ''
  const ERROR_MESSAGES: Record<string, string> = {
    missing_fields: 'Subject and message are both required.',
    no_recipients: 'No recipients matched that audience. Pick a different one or check your custom list.',
    too_many_recipients: 'Custom list exceeds the 100-recipient cap. Trim it down or split the send.',
    no_prior_broadcast: 'No prior broadcast found in the email log — "Since last broadcast" needs at least one previous broadcast send to compute the diff. Use "Ready for kickoff" instead.',
  }
  const errorMessage = errorCode && (ERROR_MESSAGES[errorCode] || `Something went wrong (${errorCode}).`)

  const cohortList = await db.select().from(cohorts).orderBy(asc(cohorts.id)).all()
  const emailConfigured = isEmailConfigured(c.env.RESEND_API_KEY)

  return c.html(
    <Layout title="Send Email" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} noindex>
      <div class="page-section" style="max-width: 700px; margin: 0 auto;">
        <a href="/admin" class="back-link">← Admin</a>
        <p class="section-label">Email</p>
        <h2>Send Email to Cohort</h2>

        {!emailConfigured && (
          <div style="margin-top: 1rem; padding: 1rem; background: #fef3cd; border: 1px solid #ffc107; border-radius: 8px; font-size: 0.9rem; color: #856404;">
            Email is not configured yet. Set the <code>RESEND_API_KEY</code> secret to enable sending.
          </div>
        )}

        {errorMessage && (
          <div style="margin-top: 1rem; padding: 1rem; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; font-size: 0.9rem; color: #991b1b;">
            {errorMessage}
          </div>
        )}

        {success === 'true' && (
          <>
            {parseInt(sent || '0') > 0 && (
              <div style="margin-top: 1rem; padding: 1rem; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; font-size: 0.9rem; color: #155724;">
                ✓ Sent to {sent} recipient{sent !== '1' ? 's' : ''}.
              </div>
            )}
            {parseInt(failed || '0') > 0 && (
              <div style="margin-top: 1rem; padding: 1rem; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; font-size: 0.9rem; color: #991b1b;">
                <strong>{failed} failed.</strong>
                {failedEmails.length > 0 ? (
                  <ul style="margin: 0.5rem 0 0 1.25rem; padding: 0;">
                    {failedEmails.map(e => (
                      <li style="font-family: var(--font-mono); font-size: 0.85rem;">{e}</li>
                    ))}
                  </ul>
                ) : (
                  <p style="margin: 0.5rem 0 0 0;">Check the <a href="/admin/emails" style="color: #991b1b; text-decoration: underline;">email log</a> for details.</p>
                )}
              </div>
            )}
          </>
        )}

        <form method="post" action="/api/admin/email/broadcast" class="apply-form" style="margin-top: 2rem;" data-broadcast-form>
          <div class="form-group">
            <label for="audience">Send to</label>
            <select id="audience" name="audience" data-audience-select style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem;">
              <option value="ready_for_kickoff">Ready for kickoff (enrolled + approved-at-$0, excludes folks who owe money)</option>
              <option value="since_last_broadcast">Since last broadcast (ready-for-kickoff folks who didn't receive the most recent broadcast)</option>
              <option value="all_approved">All approved applicants (not yet enrolled)</option>
              <option value="all_enrolled">All enrolled members</option>
              {cohortList.map(co => (
                <option value={`cohort_${co.id}`}>Enrolled in {co.title}</option>
              ))}
              <option value="all_applicants">All applicants (including pending)</option>
              <option value="custom">Custom list (paste emails below)</option>
            </select>
          </div>

          <div class="form-group" data-custom-emails-group style="display: none;">
            <label for="custom_emails">Custom recipient emails</label>
            <textarea
              id="custom_emails"
              name="custom_emails"
              rows={4}
              placeholder={"alice@example.com, bob@example.com\nor one per line"}
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.95rem; font-family: var(--font-mono); line-height: 1.5;"
            ></textarea>
            <p style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-tertiary);">
              Comma- or newline-separated. Up to 100 recipients.
            </p>
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
        <script dangerouslySetInnerHTML={{ __html: `
          // Reveal the custom-emails textarea only when audience='custom'.
          (function(){
            var sel = document.querySelector('[data-audience-select]');
            var grp = document.querySelector('[data-custom-emails-group]');
            var ta = document.getElementById('custom_emails');
            if (!sel || !grp) return;
            function sync() {
              var isCustom = sel.value === 'custom';
              grp.style.display = isCustom ? 'block' : 'none';
              if (ta) {
                if (isCustom) ta.setAttribute('required', '');
                else ta.removeAttribute('required');
              }
            }
            sel.addEventListener('change', sync);
            sync();
          })();
        ` }} />
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
  const htmlContent = renderMarkdown(bodyMarkdown)

  // Compute the "ready for kickoff" email set. Used by both the
  // `ready_for_kickoff` and `since_last_broadcast` audiences.
  // Enrolled (via app status OR enrollments table) + approved at $0.
  // Excludes anyone with status='approved' and approved_amount_cents > 0
  // (i.e. they still owe money) — Aaron handles those 1:1.
  async function computeReadyForKickoff(): Promise<Set<string>> {
    const enrolledApps = await db.select().from(applications)
      .where(eq(applications.status, 'enrolled'))
      .all()
    const enrolledUsers = await db.select({ email: users.email })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.userId, users.id))
      .all()
    const approvedZero = await db.select().from(applications)
      .where(and(
        eq(applications.status, 'approved'),
        eq(applications.approvedAmountCents, 0),
      ))
      .all()
    return new Set([
      ...enrolledApps.map(a => a.email),
      ...enrolledUsers.map(u => u.email),
      ...approvedZero.map(a => a.email),
    ])
  }

  // Build recipient list based on audience
  let emails: string[] = []

  if (audience === 'all_approved') {
    const apps = await db.select().from(applications)
      .where(eq(applications.status, 'approved'))
      .all()
    emails = apps.map(a => a.email)
  } else if (audience === 'all_enrolled') {
    const apps = await db.select().from(applications)
      .where(eq(applications.status, 'enrolled'))
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
      const approvedApps = apps.filter(a => a.status === 'approved' || a.status === 'enrolled')
      const allEmails = new Set([...enrolledUsers.map(u => u.email), ...approvedApps.map(a => a.email)])
      emails = Array.from(allEmails)
    } else {
      emails = enrolledUsers.map(u => u.email)
    }
  } else if (audience === 'all_applicants') {
    const apps = await db.select().from(applications).all()
    emails = apps.map(a => a.email)
  } else if (audience === 'custom') {
    // Parse the custom_emails textarea — comma OR newline separated.
    // Lower-cased + trimmed + de-duped + lightly validated (must contain '@').
    const raw = String(body.custom_emails || '')
    const parsed = raw.split(/[,\n]+/).map(s => s.trim().toLowerCase()).filter(Boolean)
    const valid = Array.from(new Set(parsed.filter(e => e.includes('@') && e.length <= 254)))
    if (valid.length === 0) {
      return c.redirect('/admin/email?error=no_recipients')
    }
    if (valid.length > 100) {
      return c.redirect('/admin/email?error=too_many_recipients')
    }
    emails = valid
  } else if (audience === 'ready_for_kickoff') {
    emails = Array.from(await computeReadyForKickoff())
  } else if (audience === 'since_last_broadcast') {
    // Ready-for-kickoff minus anyone who received the most recent broadcast.
    // "Most recent broadcast" = the row with max(sent_at) where
    // template='broadcast' and status='sent'. We then pull every recipient of
    // that broadcast by matching on `subject` (every row of one broadcast
    // shares one subject). Subject-match also catches manual resends of the
    // same broadcast (e.g. via admin_send_email).
    const lastBroadcast = await db.select()
      .from(emailLog)
      .where(and(
        eq(emailLog.template, 'broadcast'),
        eq(emailLog.status, 'sent'),
      ))
      .orderBy(desc(emailLog.sentAt))
      .limit(1)
      .get()
    if (!lastBroadcast) {
      return c.redirect('/admin/email?error=no_prior_broadcast')
    }
    const recipients = await db.select({ to: emailLog.to })
      .from(emailLog)
      .where(and(
        eq(emailLog.template, 'broadcast'),
        eq(emailLog.status, 'sent'),
        eq(emailLog.subject, lastBroadcast.subject),
      ))
      .all()
    const alreadySent = new Set(recipients.map(r => r.to.toLowerCase()))
    const ready = await computeReadyForKickoff()
    emails = Array.from(ready).filter(e => !alreadySent.has(e.toLowerCase()))
  }

  if (emails.length === 0) {
    return c.redirect('/admin/email?error=no_recipients')
  }

  // Map the admin-facing audience label to the email template's audience hint.
  let broadcastAudience: BroadcastAudience = 'generic'
  if (audience === 'all_enrolled' || audience.startsWith('cohort_') || audience === 'ready_for_kickoff' || audience === 'since_last_broadcast') broadcastAudience = 'enrolled'
  else if (audience === 'all_approved') broadcastAudience = 'approved'
  else if (audience === 'all_applicants') broadcastAudience = 'applicants'
  // 'custom' falls through to 'generic' — admin should pick the most
  // appropriate template by composing their own subject/body.

  const result = await sendBroadcast(c.env, emails, subject, htmlContent, broadcastAudience)

  // Cap failed-emails URL param so we don't bust URL limits; if truncated,
  // admin can still see the full list in the email log.
  const failedEmailsList = result.failed.map(f => f.email)
  const MAX_FAILED_IN_URL = 50
  const failedEmailsParam = encodeURIComponent(
    failedEmailsList.slice(0, MAX_FAILED_IN_URL).join(',')
  )

  return c.redirect(
    `/admin/email?success=true&sent=${result.sent.length}&failed=${result.failed.length}&failed_emails=${failedEmailsParam}`
  )
})

// ===== API ADMIN GUARD =====
// These endpoints are called by HTML form POSTs, so handle auth failures
// with redirects (not JSON) to match the HTML admin guard behavior.
admin.use('/api/admin/*', async (c, next) => {
  if (!isClerkConfigured(c)) {
    await next()
    return
  }
  const user = c.get('user')
  if (!user) {
    // Session expired or not authenticated — redirect to sign-in.
    // Use the Referer header to send the user back to the page they were on.
    const referer = c.req.header('referer')
    let redirectUrl = '/admin'
    if (referer) {
      try {
        const refPath = new URL(referer).pathname
        if (refPath.startsWith('/admin')) redirectUrl = refPath
      } catch {}
    }
    return c.redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`)
  }
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
  const customAmountDollarsRaw = String(body.custom_amount_dollars || '').trim()
  const customAmountCents = customAmountDollarsRaw === ''
    ? null
    : Math.round(Number(customAmountDollarsRaw) * 100)
  const customAmountValid = customAmountCents == null || (Number.isFinite(customAmountCents) && customAmountCents >= 0)

  if (action !== 'approve' && action !== 'reject') {
    return c.redirect(`/admin/applications/${id}`)
  }

  if (!customAmountValid) {
    return c.redirect(`/admin/applications/${id}?error=invalid_amount`)
  }

  const status = action === 'approve' ? 'approved' : 'rejected'
  const updateData: Record<string, any> = {
    status,
    pricingTier,
    approvedAmountCents: status === 'approved' ? customAmountCents : null,
    notes,
  }

  if (status === 'approved') {
    updateData.approvedAt = new Date().toISOString()
    // Generate a payment token if one doesn't already exist.
    const existing = await db.select({ paymentToken: applications.paymentToken })
      .from(applications).where(eq(applications.id, id)).get()
    if (!existing?.paymentToken) {
      updateData.paymentToken = generateToken()
    }
  }

  await db
    .update(applications)
    .set(updateData)
    .where(eq(applications.id, id))

  // Get the updated application for email
  const app = await db.select().from(applications).where(eq(applications.id, id)).get()

  if (app && status === 'approved') {
    const amountCents = getApplicationAmount(app)
    const isSponsored = amountCents === 0
    const baseUrl = new URL(c.req.url).origin
    const paymentUrl = `${baseUrl}/payment/checkout/${app.id}?t=${app.paymentToken}`

    // Sponsored applicants: if a user account already exists for this
    // email, enroll them immediately and send the welcome email. The
    // approval email is skipped — the welcome email is the right
    // signal that they're in. If no user account yet, fall through to
    // the normal approval email; the Clerk user.created hook will
    // auto-enroll them when they sign up.
    let autoEnrolled = false
    if (isSponsored) {
      const existingUser = await findUserByEmail(db, app.email)
      const cohort = await db.select().from(cohorts).where(eq(cohorts.slug, 'cohort-1')).get()
      if (existingUser && cohort) {
        c.executionCtx.waitUntil(
          enrollUserAndNotify(db, c.env, {
            userId: existingUser.id,
            applicationId: app.id,
            cohortId: cohort.id,
          }),
        )
        autoEnrolled = true
      }
    }

    if (!autoEnrolled) {
      // Send approval email with payment (or sign-up) link (non-blocking)
      c.executionCtx.waitUntil(
        sendApplicationApproved(
          c.env,
          app.email,
          app.name,
          paymentUrl,
          getApplicationLabel(app),
          formatCents(amountCents),
          isSponsored
        )
      )
    }
  } else if (app && status === 'rejected') {
    // Send rejection email (non-blocking)
    c.executionCtx.waitUntil(
      sendApplicationRejected(c.env, app.email, app.name)
    )
  }

  return c.redirect(`/admin/applications/${id}`)
})

// ===== API: UPDATE COHORT MEETING URL =====
admin.post('/api/admin/cohorts/:id/meeting-url', async (c) => {
  const db = getDb(c.env.DB)
  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.parseBody()
  const rawUrl = String(body.meeting_url || '').trim()

  // Allow clearing. Otherwise require http(s).
  const meetingUrl = rawUrl === '' ? null : rawUrl
  if (meetingUrl && !/^https?:\/\//i.test(meetingUrl)) {
    return c.redirect('/admin?error=invalid_meeting_url')
  }

  await db.update(cohorts).set({ meetingUrl }).where(eq(cohorts.id, id))
  return c.redirect('/admin')
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

// ===== API: DELETE APPLICATION =====
admin.post('/api/admin/applications/:id/delete', async (c) => {
  const db = getDb(c.env.DB)
  const id = parseInt(c.req.param('id'), 10)

  // Delete associated payments first
  await db.delete(payments).where(eq(payments.applicationId, id))
  // Delete the application
  await db.delete(applications).where(eq(applications.id, id))

  return c.redirect('/admin/applications')
})

// ===== API: CHANGE APPLICATION TIER / PRICE =====
admin.post('/api/admin/applications/:id/tier', async (c) => {
  const db = getDb(c.env.DB)
  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.parseBody()
  const pricingTier = String(body.pricing_tier || 'standard')
  const validTiers = ['standard', 'discounted', 'sponsor', 'pending']
  const notify = String(body.notify || '') === 'true'
  const customAmountDollarsRaw = String(body.custom_amount_dollars || '').trim()
  const customAmountCents = customAmountDollarsRaw === ''
    ? null
    : Math.round(Number(customAmountDollarsRaw) * 100)

  if (!validTiers.includes(pricingTier)) {
    return c.redirect(`/admin/applications/${id}?error=invalid_tier`)
  }
  if (customAmountCents != null && (!Number.isFinite(customAmountCents) || customAmountCents < 0)) {
    return c.redirect(`/admin/applications/${id}?error=invalid_amount`)
  }

  // Capture the previous amount BEFORE updating, so we can detect a real change for the email.
  const prev = await db.select().from(applications).where(eq(applications.id, id)).get()
  if (!prev) {
    return c.redirect(`/admin/applications`)
  }
  const prevAmountCents = getApplicationAmount(prev)

  await db.update(applications)
    .set({ pricingTier, approvedAmountCents: customAmountCents })
    .where(eq(applications.id, id))

  const updated = await db.select().from(applications).where(eq(applications.id, id)).get()
  if (!updated) {
    return c.redirect(`/admin/applications/${id}`)
  }
  const newAmountCents = getApplicationAmount(updated)

  // If the amount actually changed, expire any open Stripe sessions
  // tied to old pending payments so the applicant's stored link
  // doesn't redirect them to a session at the old price.
  if (newAmountCents !== prevAmountCents && isStripeConfigured(c.env.STRIPE_SECRET_KEY)) {
    const pendingPayments = await db.select().from(payments)
      .where(and(eq(payments.applicationId, id), eq(payments.status, 'pending')))
      .all()
    const stripe = getStripe(c.env.STRIPE_SECRET_KEY)
    for (const p of pendingPayments) {
      if (!p.stripeCheckoutSessionId) continue
      try {
        await stripe.checkout.sessions.expire(p.stripeCheckoutSessionId)
      } catch (err) {
        console.error(`[Admin] Could not expire Stripe session ${p.stripeCheckoutSessionId}:`, err)
      }
    }
  }

  // Notify the applicant if the price actually changed and notify is requested.
  // Skip the email entirely for already-enrolled applicants (they've paid).
  if (notify && newAmountCents !== prevAmountCents && updated.status === 'approved') {
    const baseUrl = new URL(c.req.url).origin
    const paymentUrl = `${baseUrl}/payment/checkout/${updated.id}${updated.paymentToken ? `?t=${updated.paymentToken}` : ''}`
    c.executionCtx.waitUntil(
      sendApplicationPriceChanged(
        c.env,
        updated.email,
        updated.name,
        formatCents(prevAmountCents),
        formatCents(newAmountCents),
        getApplicationLabel(updated),
        paymentUrl,
        newAmountCents === 0
      )
    )
  }

  return c.redirect(`/admin/applications/${id}`)
})

// ===== API: BULK APPLICATION ACTIONS =====
admin.post('/api/admin/applications/bulk', async (c) => {
  const db = getDb(c.env.DB)
  const body = await c.req.parseBody()
  const ids = String(body.ids || '').split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
  const action = String(body.action || '')
  const pricingTier = String(body.pricing_tier || 'standard')
  const validTiers = ['standard', 'discounted', 'sponsor']

  if (ids.length === 0 || (action !== 'approve' && action !== 'reject')) {
    return c.redirect('/admin/applications')
  }

  if (action === 'approve' && !validTiers.includes(pricingTier)) {
    return c.redirect('/admin/applications')
  }

  const status = action === 'approve' ? 'approved' : 'rejected'

  for (const id of ids) {
    const updateData: Record<string, any> = {
      status,
      pricingTier: action === 'approve' ? pricingTier : 'pending',
    }
    if (status === 'approved') {
      updateData.approvedAt = new Date().toISOString()
      const existing = await db.select({ paymentToken: applications.paymentToken })
        .from(applications).where(eq(applications.id, id)).get()
      if (!existing?.paymentToken) {
        updateData.paymentToken = generateToken()
      }
    }

    await db.update(applications).set(updateData).where(eq(applications.id, id))

    // Send emails (non-blocking)
    const app = await db.select().from(applications).where(eq(applications.id, id)).get()
    if (app && status === 'approved') {
      const amountCents = getAmountForTier(pricingTier)
      const baseUrl = new URL(c.req.url).origin
      const paymentUrl = `${baseUrl}/payment/checkout/${app.id}?t=${app.paymentToken}`
      c.executionCtx.waitUntil(
        sendApplicationApproved(c.env, app.email, app.name, paymentUrl, getTierLabel(pricingTier), formatCents(amountCents), amountCents === 0)
      )
    } else if (app && status === 'rejected') {
      c.executionCtx.waitUntil(
        sendApplicationRejected(c.env, app.email, app.name)
      )
    }
  }

  return c.redirect('/admin/applications')
})

// ===== API: UPDATE USER ACCOUNT =====
admin.post('/api/admin/accounts/:id', async (c) => {
  const db = getDb(c.env.DB)
  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.parseBody()

  const name = String(body.name || '').trim() || null
  const email = String(body.email || '').trim()
  const role = String(body.role || 'student')
  const validRoles = ['student', 'alumni', 'facilitator', 'admin']
  const bio = String(body.bio || '').trim() || null
  const location = String(body.location || '').trim() || null
  const website = String(body.website || '').trim() || null

  if (!email || !validRoles.includes(role)) {
    return c.redirect(`/admin/accounts/${id}`)
  }

  try {
    await db.update(users)
      .set({ name, email, role, bio, location, website, updatedAt: new Date().toISOString() })
      .where(eq(users.id, id))
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return c.redirect(`/admin/accounts/${id}?error=email_taken`)
    }
    throw err
  }

  return c.redirect(`/admin/accounts/${id}?saved=true`)
})

// ===== API: DELETE USER ACCOUNT =====
admin.post('/api/admin/accounts/:id/delete', async (c) => {
  const db = getDb(c.env.DB)
  const id = parseInt(c.req.param('id'), 10)

  // Prevent self-deletion
  const currentUser = c.get('user')
  if (currentUser && currentUser.id === id) {
    return c.redirect(`/admin/accounts/${id}?error=self_delete`)
  }

  // Cascade delete all user data
  await db.delete(comments).where(eq(comments.userId, id))
  await db.delete(discussions).where(eq(discussions.userId, id))
  await db.delete(lessonProgress).where(eq(lessonProgress.userId, id))
  await db.delete(projects).where(eq(projects.userId, id))
  await db.delete(apiKeys).where(eq(apiKeys.userId, id))
  await db.delete(memberships).where(eq(memberships.userId, id))
  await db.delete(enrollments).where(eq(enrollments.userId, id))
  await db.delete(payments).where(eq(payments.userId, id))
  // Unlink applications (don't delete — keep the application record)
  await db.update(applications).set({ userId: null }).where(eq(applications.userId, id))
  // Delete the user
  await db.delete(users).where(eq(users.id, id))

  return c.redirect('/admin/accounts')
})

// ===== API: SEND INDIVIDUAL EMAIL =====
admin.post('/api/admin/email/send', async (c) => {
  const body = await c.req.parseBody()
  const to = String(body.to || '').trim()
  const subject = String(body.subject || '').trim()
  const bodyMarkdown = String(body.body_markdown || '').trim()

  if (!to || !subject || !bodyMarkdown) {
    return c.redirect('/admin/email/compose?error=missing_fields')
  }

  const htmlContent = renderMarkdown(bodyMarkdown)

  // Use the branded email wrapper via sendEmail
  const result = await sendEmail({
    apiKey: c.env.RESEND_API_KEY,
    from: c.env.EMAIL_FROM,
    to,
    subject: `${subject} — Learn Vibe Build`,
    html: `<!DOCTYPE html>
<html><head><style>body{margin:0;padding:0;background:#fafaf8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;line-height:1.7;}</style></head>
<body><div style="max-width:560px;margin:0 auto;padding:40px 24px;">
<div style="margin-bottom:32px;"><a href="https://learnvibe.build" style="font-size:16px;font-weight:600;color:#1a1a1a;text-decoration:none;">Learn Vibe Build</a></div>
<div style="background:#fff;border:1px solid #e5e2db;border-radius:12px;padding:32px;">${htmlContent}</div>
<div style="text-align:center;padding-top:24px;"><p style="font-size:13px;color:#999;">Learn Vibe Build · Boulder, Colorado</p></div>
</div></body></html>`,
    db: c.env.DB,
    template: 'admin_individual',
  })

  if (result.success) {
    return c.redirect(`/admin/email/compose?success=true&to=${encodeURIComponent(to)}`)
  }
  return c.redirect(`/admin/email/compose?error=send_failed&to=${encodeURIComponent(to)}`)
})

export default admin
