import { Hono } from 'hono'
import { eq, and, asc } from 'drizzle-orm'
import { Layout } from '../components/Layout'
import { getDb } from '../db'
import { cohorts, lessons, lessonProgress, artifacts, users } from '../db/schema'
import { or, desc } from 'drizzle-orm'
import { renderMarkdown } from '../lib/markdown'
import { canAccessCohort } from '../lib/access'
import { generateCohortICS } from '../lib/ics'
import { isAdmin } from '../lib/auth'
import type { AppContext } from '../types'

type ArtifactRow = {
  id: number
  title: string | null
  bodyMarkdown: string | null
  attachedUrl: string | null
  generatedBy: string
  visibility: string
  createdAt: string
  updatedAt: string
  userId: number
  authorName: string | null
  authorAvatar: string | null
}

const GEN_BADGE: Record<string, { label: string; icon: string; cls: string }> = {
  human: { label: 'Mostly human', icon: '🖊', cls: 'human' },
  collaborative: { label: 'Human + AI', icon: '🧩', cls: 'collaborative' },
  ai: { label: 'Mostly AI', icon: '🤖', cls: 'ai' },
}

const ArtifactCard = ({
  a, currentUser, isAdminUser, returnPath,
}: {
  a: ArtifactRow
  currentUser: { id: number } | null
  isAdminUser: boolean
  returnPath: string
}) => {
  const badge = GEN_BADGE[a.generatedBy] || GEN_BADGE.collaborative
  const isOwner = currentUser?.id === a.userId
  const bodyHtml = a.bodyMarkdown ? renderMarkdown(a.bodyMarkdown) : ''
  return (
    <div class="artifact-card" id={`artifact-${a.id}`}>
      <div class="artifact-card-header">
        <h4 class="artifact-card-title">{a.title || 'Untitled artifact'}</h4>
        <div class="artifact-card-meta">
          <span class={`artifact-badge ${badge.cls}`}>
            <span aria-hidden="true">{badge.icon}</span> {badge.label}
          </span>
          {a.visibility === 'instructor' && (
            <span class="artifact-visibility" title="Shared with instructors only">
              🔒 Instructor only
            </span>
          )}
        </div>
      </div>
      <div style="font-size: 0.85rem; color: var(--text-tertiary); margin-bottom: 0.5rem;">
        Shared by <a href={`/members/${a.userId}`} style="color: var(--text-secondary); text-decoration: none; font-weight: 500;">{a.authorName || 'Anonymous'}</a>
        {' · '}
        {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
      {bodyHtml && (
        <div class="artifact-card-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      )}
      {a.attachedUrl && (
        <a href={a.attachedUrl} target="_blank" rel="noopener" class="artifact-card-link">
          Open link ↗
        </a>
      )}
      {(isOwner || isAdminUser) && (
        <div class="artifact-card-actions">
          {isOwner && (
            <a href={`${returnPath}?edit_artifact=${a.id}#artifact-${a.id}`}>Edit</a>
          )}
          <form method="post" action={`/api/artifacts/${a.id}/delete`} style="display: inline;"
            onsubmit="return confirm('Delete this artifact? This cannot be undone.')">
            <input type="hidden" name="return_url" value={returnPath} />
            <button type="submit">Delete</button>
          </form>
        </div>
      )}
    </div>
  )
}

const ArtifactForm = ({
  lessonId, returnPath, editing,
}: {
  lessonId: number
  returnPath: string
  editing?: ArtifactRow
}) => {
  const isEdit = !!editing
  const action = isEdit ? `/api/artifacts/${editing.id}` : '/api/artifacts'
  const gen = editing?.generatedBy || 'collaborative'
  const vis = editing?.visibility || 'class'
  return (
    <div class="artifact-form-section" id="artifact-form">
      <h3>{isEdit ? 'Edit artifact' : 'Share an artifact'}</h3>
      <p class="lead">
        {isEdit
          ? 'Update your artifact below.'
          : 'Share what you made — a reflection, a document, a link to something you built. Either a written description or a link is enough; both is great.'}
      </p>
      <form method="post" action={action} class="artifact-form">
        {!isEdit && <input type="hidden" name="lesson_id" value={String(lessonId)} />}
        <div class="form-group">
          <label for="af-title">Title (optional)</label>
          <input type="text" id="af-title" name="title" maxlength={200}
            placeholder="e.g. My map of what I'm working on"
            value={editing?.title || ''} />
        </div>
        <div class="form-group">
          <label for="af-body">What you made (markdown)</label>
          <textarea id="af-body" name="body_markdown" maxlength={20000}
            placeholder="Paste the artifact itself, or a reflection — markdown is supported.">{editing?.bodyMarkdown || ''}</textarea>
        </div>
        <div class="form-group">
          <label for="af-url">Link (optional — for external docs, sites, etc.)</label>
          <input type="url" id="af-url" name="attached_url" maxlength={500}
            placeholder="https://..."
            value={editing?.attachedUrl || ''} />
          <p style="margin-top: 0.4rem; font-size: 0.8rem; color: var(--text-tertiary);">
            At least one of "what you made" or "link" must be filled in.
          </p>
        </div>
        <div class="form-group">
          <label>How was this made?</label>
          <div class="radio-group">
            <label>
              <input type="radio" name="generated_by" value="human" checked={gen === 'human'} />
              <span>
                <span class="radio-label-title">🖊 I wrote this mostly myself</span>
                <span class="radio-label-desc" style="display: block;">AI may have been in the process, but the final words are mine.</span>
              </span>
            </label>
            <label>
              <input type="radio" name="generated_by" value="collaborative" checked={gen === 'collaborative'} />
              <span>
                <span class="radio-label-title">🧩 Relatively equal parts human + AI</span>
                <span class="radio-label-desc" style="display: block;">AI and I shaped this together; you couldn't easily pull out whose is whose.</span>
              </span>
            </label>
            <label>
              <input type="radio" name="generated_by" value="ai" checked={gen === 'ai'} />
              <span>
                <span class="radio-label-title">🤖 Mostly AI putting it together</span>
                <span class="radio-label-desc" style="display: block;">I prompted, AI produced the bulk. My curation, AI's words.</span>
              </span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>Who can see this?</label>
          <div class="radio-group">
            <label>
              <input type="radio" name="visibility" value="class" checked={vis === 'class'} />
              <span>
                <span class="radio-label-title">Share with the whole class</span>
                <span class="radio-label-desc" style="display: block;">Visible to all cohort members and instructors.</span>
              </span>
            </label>
            <label>
              <input type="radio" name="visibility" value="instructor" checked={vis === 'instructor'} />
              <span>
                <span class="radio-label-title">🔒 Share with instructors only</span>
                <span class="radio-label-desc" style="display: block;">Only you and the instructors can see this.</span>
              </span>
            </label>
          </div>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center; margin-top: 1.5rem;">
          <button type="submit" style="background: var(--accent); color: white; border: none; padding: 0.75rem 2rem; border-radius: 6px; font-size: 0.95rem; font-weight: 500; cursor: pointer;">
            {isEdit ? 'Save changes' : 'Share artifact'}
          </button>
          {isEdit && (
            <a href={returnPath + '#artifacts'} style="font-size: 0.9rem; color: var(--text-secondary);">
              Cancel
            </a>
          )}
        </div>
      </form>
    </div>
  )
}

const cohortRoutes = new Hono<AppContext>()

// Gated content message component
const GatedMessage = ({ cohort, user, clerkPubKey }: { cohort: { title: string; slug: string }; user: any; clerkPubKey?: string }) => (
  <Layout title={cohort.title} user={user} clerkPubKey={clerkPubKey}>
    <div class="page-section" style="max-width: 640px; margin: 0 auto; padding: 4rem 0;">
      <p class="section-label" style="text-align: center;">Members Only</p>
      <h2 style="text-align: center;">{cohort.title}</h2>

      {!user ? (
        <>
          <p style="margin-top: 1.5rem; color: var(--text-secondary); line-height: 1.7; text-align: center;">
            Already approved or enrolled? Sign in or create an account to access the cohort materials.
          </p>
          <div style="margin-top: 1.5rem; padding: 1rem 1.25rem; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; font-size: 0.92rem; color: var(--text-secondary); line-height: 1.6;">
            <strong style="color: var(--text);">Important:</strong> Use the same email address you applied with — that's how your account gets matched to your enrollment automatically.
          </div>
          <div style="margin-top: 2rem; display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <a href="/sign-in" style="display: inline-block; background: var(--accent); color: white; padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: 500;">
              Sign In
            </a>
            <a href="/sign-up" style="display: inline-block; border: 1px solid var(--accent); color: var(--accent); padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: 500;">
              Create Account
            </a>
            <a href="/apply" style="display: inline-block; border: 1px solid var(--border); padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; color: var(--text); font-weight: 500;">
              Apply
            </a>
          </div>
        </>
      ) : (
        <>
          <p style="margin-top: 1.5rem; color: var(--text-secondary); line-height: 1.7; text-align: center;">
            You're signed in as <strong>{user.email}</strong>, but we don't have an active enrollment for this email yet.
          </p>
          <div style="margin-top: 1.5rem; padding: 1rem 1.25rem; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; font-size: 0.92rem; color: var(--text-secondary); line-height: 1.6;">
            If you applied with a different email, sign out and sign back in using the email address from your application — your enrollment will link automatically.
          </div>
          <div style="margin-top: 2rem; display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <a href="/sign-out" style="display: inline-block; border: 1px solid var(--border); padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; color: var(--text); font-weight: 500;">
              Sign Out
            </a>
            <a href="/apply" style="display: inline-block; border: 1px solid var(--border); padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; color: var(--text); font-weight: 500;">
              Apply
            </a>
            <a href="mailto:ag@unforced.dev" style="display: inline-block; background: var(--accent); color: white; padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: 500;">
              Email Aaron
            </a>
          </div>
        </>
      )}
    </div>
  </Layout>
)

// Cohort hub — /cohort/:slug
cohortRoutes.get('/cohort/:slug', async (c) => {
  const slug = c.req.param('slug')
  const db = getDb(c.env.DB)
  const user = c.get('user')

  const cohort = await db.select().from(cohorts).where(eq(cohorts.slug, slug)).get()

  if (!cohort) {
    return c.html(
      <Layout title="Not Found" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY}>
        <div class="page-section" style="text-align: center; padding: 6rem 0;">
          <h2>Cohort not found</h2>
          <p><a href="/">← Back to homepage</a></p>
        </div>
      </Layout>,
      404
    )
  }

  // Access control: check if user can view this cohort
  const hasAccess = await canAccessCohort(c.env.DB, user, cohort.id, cohort.isPublic)
  if (!hasAccess) {
    return c.html(<GatedMessage cohort={cohort} user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} />, 403)
  }

  const cohortLessons = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.cohortId, cohort.id), eq(lessons.status, 'published')))
    .orderBy(asc(lessons.sortOrder), asc(lessons.weekNumber))
    .all()

  // Get user's progress for this cohort
  const completedLessonIds = new Set<number>()
  if (user) {
    const progress = await db
      .select({ lessonId: lessonProgress.lessonId })
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, user.id),
          eq(lessonProgress.cohortId, cohort.id)
        )
      )
      .all()
    progress.forEach(p => completedLessonIds.add(p.lessonId))
  }

  const completedCount = completedLessonIds.size
  const totalLessons = cohortLessons.length
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  const statusBadge = cohort.status === 'completed'
    ? <span class="badge badge-completed">Completed</span>
    : cohort.status === 'active'
    ? <span class="badge badge-active">Active</span>
    : null

  return c.html(
    <Layout title={cohort.title} description={cohort.description || undefined} user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY}>
      <div class="page-section">
        <a href="/" class="back-link">← Home</a>

        <p class="section-label">{cohort.title}</p>
        <h2>{cohort.title}</h2>
        {statusBadge}
        {cohort.description && <p class="lead" style="margin-top: 1rem;">{cohort.description}</p>}

        <p style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-tertiary); margin-top: 1rem;">
          {cohort.weeks} weeks
          {cohort.startDate && <> · Started {new Date(cohort.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</>}
        </p>

        {user && totalLessons > 0 && (
          <div style="margin-top: 1.5rem;">
            <div class="progress-label">
              <span>{completedCount} of {totalLessons} lessons complete</span>
              <span>{progressPercent}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style={`width: ${progressPercent}%`}></div>
            </div>
          </div>
        )}

        {cohort.meetingUrl && (
          <div style="margin-top: 1.5rem; padding: 1rem 1.25rem; background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); border: 1px solid #f59e0b; border-radius: 10px; color: #78350f; display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between;">
            <div style="flex: 1; min-width: 200px;">
              <div style="font-weight: 600; font-size: 1rem;">🔴 Live session</div>
              <div style="font-size: 0.85rem; color: #92400e; margin-top: 0.15rem;">Mondays 5:30–7:30pm MT · {cohort.weeks} weeks</div>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <a
                href={`/cohort/${slug}/sessions.ics`}
                style="padding: 0.5rem 0.85rem; background: rgba(255,255,255,0.6); border: 1px solid #f59e0b; border-radius: 6px; text-decoration: none; color: #78350f; font-size: 0.85rem; font-weight: 500; white-space: nowrap;"
              >
                📅 Add to calendar
              </a>
              <a
                href={cohort.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                style="padding: 0.5rem 1rem; background: #78350f; color: white; border-radius: 6px; text-decoration: none; font-size: 0.9rem; font-weight: 500; white-space: nowrap;"
              >
                Join →
              </a>
            </div>
          </div>
        )}

        {cohortLessons.length > 0 ? (
          <div class="week-grid">
            {cohortLessons.map((lesson) => (
              <a href={`/cohort/${slug}/week/${lesson.weekNumber}`} class="week-card">
                <div class="week-card-info">
                  <h3>
                    {completedLessonIds.has(lesson.id) && <span class="lesson-check" title="Completed">✓ </span>}
                    Week {lesson.weekNumber}: {lesson.title}
                  </h3>
                  {lesson.description && <p>{lesson.description}</p>}
                </div>
                <span class="week-card-meta">
                  {lesson.date && new Date(lesson.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p style="margin-top: 2rem; color: var(--text-tertiary);">
            No lessons published yet. Check back soon.
          </p>
        )}

        {user && (
          <div style="margin-top: 2rem; display: flex; gap: 1rem; flex-wrap: wrap;">
            <a href={`/cohort/${slug}/discussions`} style="color: var(--accent); font-weight: 500; font-size: 0.9rem;">
              Discussions →
            </a>
          </div>
        )}
      </div>
    </Layout>
  )
})

// ICS calendar feed — /cohort/:slug/sessions.ics
// Alias for /sessions.ics — older emails linked /calendar.ics. Keep both working.
cohortRoutes.get('/cohort/:slug/calendar.ics', async (c) => {
  return c.redirect(`/cohort/${c.req.param('slug')}/sessions.ics`, 301)
})

cohortRoutes.get('/cohort/:slug/sessions.ics', async (c) => {
  const slug = c.req.param('slug')
  const db = getDb(c.env.DB)

  const cohort = await db.select().from(cohorts).where(eq(cohorts.slug, slug)).get()
  if (!cohort) return c.notFound()

  // No auth gate — external calendar apps (Google Calendar, Apple Calendar,
  // etc.) can't carry Clerk cookies when subscribing. The content (session
  // times + Regen Hub address + meeting URL) is all already in every prep
  // email sent to enrolled folks, so making the feed public-by-URL doesn't
  // expose anything new. Future: token-per-user URLs for private feeds.

  if (!cohort.startDate) return c.text('Cohort has no start date set', 409)

  const cohortLessons = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.cohortId, cohort.id), eq(lessons.status, 'published')))
    .orderBy(asc(lessons.weekNumber))
    .all()

  const ics = generateCohortICS({
    cohortSlug: cohort.slug,
    cohortTitle: cohort.title,
    firstSessionDate: cohort.startDate,
    weeks: cohort.weeks,
    meetingUrl: cohort.meetingUrl,
    sessions: cohortLessons.map(l => ({
      weekNumber: l.weekNumber,
      title: l.title,
      description: l.description,
    })),
  })

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="learnvibe-${cohort.slug}.ics"`,
      'Cache-Control': 'no-store',
    },
  })
})

// Lesson page — /cohort/:slug/week/:num
cohortRoutes.get('/cohort/:slug/week/:num', async (c) => {
  const slug = c.req.param('slug')
  const weekNum = parseInt(c.req.param('num'), 10)
  const db = getDb(c.env.DB)
  const user = c.get('user')

  if (isNaN(weekNum)) {
    return c.redirect(`/cohort/${slug}`)
  }

  const cohort = await db.select().from(cohorts).where(eq(cohorts.slug, slug)).get()

  if (!cohort) {
    return c.html(
      <Layout title="Not Found" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY}>
        <div class="page-section" style="text-align: center; padding: 6rem 0;">
          <h2>Cohort not found</h2>
          <p><a href="/">← Back to homepage</a></p>
        </div>
      </Layout>,
      404
    )
  }

  // Access control
  const hasAccess = await canAccessCohort(c.env.DB, user, cohort.id, cohort.isPublic)
  if (!hasAccess) {
    return c.html(<GatedMessage cohort={cohort} user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY} />, 403)
  }

  const lesson = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.cohortId, cohort.id),
        eq(lessons.weekNumber, weekNum),
        eq(lessons.status, 'published')
      )
    )
    .get()

  if (!lesson) {
    return c.html(
      <Layout title="Not Found" user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY}>
        <div class="page-section" style="text-align: center; padding: 6rem 0;">
          <h2>Lesson not found</h2>
          <p><a href={`/cohort/${slug}`}>← Back to {cohort.title}</a></p>
        </div>
      </Layout>,
      404
    )
  }

  const renderedContent = renderMarkdown(lesson.contentMarkdown)

  // Check if user has completed this lesson
  let isCompleted = false
  if (user) {
    const progress = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, user.id),
          eq(lessonProgress.lessonId, lesson.id)
        )
      )
      .get()
    isCompleted = !!progress
  }

  // Get all lessons for prev/next navigation
  const allLessons = await db
    .select({ weekNumber: lessons.weekNumber, title: lessons.title })
    .from(lessons)
    .where(and(eq(lessons.cohortId, cohort.id), eq(lessons.status, 'published')))
    .orderBy(asc(lessons.weekNumber))
    .all()

  const currentIndex = allLessons.findIndex(l => l.weekNumber === weekNum)
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

  // ===== ARTIFACTS for this lesson =====
  // Visibility rules:
  //   - class-visible: seen by everyone enrolled in the cohort (we already
  //     gate the whole page via canAccessCohort, so "everyone here" = fine)
  //   - instructor-visible: owner sees their own, admins/facilitators see all
  const isAdminUser = isAdmin(user)
  const lessonArtifacts = await db
    .select({
      id: artifacts.id,
      title: artifacts.title,
      bodyMarkdown: artifacts.bodyMarkdown,
      attachedUrl: artifacts.attachedUrl,
      generatedBy: artifacts.generatedBy,
      visibility: artifacts.visibility,
      createdAt: artifacts.createdAt,
      updatedAt: artifacts.updatedAt,
      userId: artifacts.userId,
      authorName: users.name,
      authorAvatar: users.avatarUrl,
    })
    .from(artifacts)
    .innerJoin(users, eq(users.id, artifacts.userId))
    .where(and(
      eq(artifacts.lessonId, lesson.id),
      eq(artifacts.status, 'active'),
      isAdminUser
        ? eq(artifacts.lessonId, lesson.id)
        : (user
          ? or(eq(artifacts.visibility, 'class'), eq(artifacts.userId, user.id))!
          : eq(artifacts.visibility, 'class')),
    ))
    .orderBy(desc(artifacts.createdAt))
    .all()

  // Find an editing artifact if ?edit_artifact=ID is set + user is the owner
  const editId = parseInt(c.req.query('edit_artifact') || '', 10)
  const editing = Number.isFinite(editId)
    ? lessonArtifacts.find(a => a.id === editId && a.userId === user?.id)
    : undefined

  // Flash messages from form redirects
  const artifactSaved = c.req.query('artifact_saved') === '1'
  const artifactDeleted = c.req.query('artifact_deleted') === '1'
  const artifactError = c.req.query('artifact_error')

  const returnPath = `/cohort/${slug}/week/${weekNum}`

  return c.html(
    <Layout title={`Week ${weekNum}: ${lesson.title}`} description={lesson.description || undefined} user={user} clerkPubKey={c.env.CLERK_PUBLISHABLE_KEY}>
      <div class="page-section">
        <a href={`/cohort/${slug}`} class="back-link">← {cohort.title}</a>

        <p class="section-label">Week {weekNum}</p>
        <h2>{lesson.title}</h2>
        {lesson.description && <p class="lead">{lesson.description}</p>}
        {lesson.date && (
          <p style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-tertiary); margin-bottom: 2rem;">
            {new Date(lesson.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}

        <div class="lesson-content" dangerouslySetInnerHTML={{ __html: renderedContent }} />

        {user && (
          <div style="margin-top: 2rem; padding: 1.5rem; background: var(--surface); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <form method="post" action={`/api/progress/${lesson.id}`}>
              <input type="hidden" name="cohort_id" value={String(cohort.id)} />
              <input type="hidden" name="return_url" value={`/cohort/${slug}/week/${weekNum}`} />
              <button
                type="submit"
                style={`border: none; padding: 0.6rem 1.5rem; border-radius: 6px; font-size: 0.9rem; font-weight: 500; cursor: pointer; ${
                  isCompleted
                    ? 'background: #dcfce7; color: #166534;'
                    : 'background: var(--accent); color: white;'
                }`}
              >
                {isCompleted ? '✓ Completed — Click to Undo' : 'Mark as Complete'}
              </button>
            </form>
            <a href={`/cohort/${slug}/discussions`} style="color: var(--accent); font-size: 0.9rem; font-weight: 500;">
              Discuss this lesson →
            </a>
          </div>
        )}

        {/* ===== ARTIFACTS ===== */}
        <div id="artifacts" style="margin-top: 3rem;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.5rem;">
            <h3 style="font-family: var(--font-display);">Artifacts</h3>
            <p style="font-size: 0.85rem; color: var(--text-tertiary); margin: 0;">
              {lessonArtifacts.length === 0
                ? 'No artifacts shared yet — be the first.'
                : `${lessonArtifacts.length} ${lessonArtifacts.length === 1 ? 'artifact' : 'artifacts'} shared so far`}
            </p>
          </div>

          {artifactSaved && (
            <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #166534; font-size: 0.9rem;">
              Artifact saved.
            </div>
          )}
          {artifactDeleted && (
            <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text-secondary); font-size: 0.9rem;">
              Artifact deleted.
            </div>
          )}
          {artifactError === 'empty' && (
            <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b; font-size: 0.9rem;">
              Please include either a description or a link (or both).
            </div>
          )}
          {artifactError === 'invalid_url' && (
            <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b; font-size: 0.9rem;">
              Link must start with http:// or https://.
            </div>
          )}

          <div style="margin-top: 1.5rem;">
            {lessonArtifacts.map(a => (
              <ArtifactCard
                a={a}
                currentUser={user ? { id: user.id } : null}
                isAdminUser={isAdminUser}
                returnPath={returnPath}
              />
            ))}
          </div>

          {user && <ArtifactForm lessonId={lesson.id} returnPath={returnPath} editing={editing} />}
        </div>

        <div class="week-nav">
          <div>
            {prevLesson && (
              <a href={`/cohort/${slug}/week/${prevLesson.weekNumber}`}>
                ← Week {prevLesson.weekNumber}: {prevLesson.title}
              </a>
            )}
          </div>
          <div>
            {nextLesson && (
              <a href={`/cohort/${slug}/week/${nextLesson.weekNumber}`}>
                Week {nextLesson.weekNumber}: {nextLesson.title} →
              </a>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
})

export default cohortRoutes
