import { Hono } from 'hono'
import { eq, and, asc } from 'drizzle-orm'
import { Layout } from '../components/Layout'
import { getDb } from '../db'
import { cohorts, lessons } from '../db/schema'
import { renderMarkdown } from '../lib/markdown'
import type { AppContext } from '../types'

const cohortRoutes = new Hono<AppContext>()

// Cohort hub — /cohort/:slug
cohortRoutes.get('/cohort/:slug', async (c) => {
  const slug = c.req.param('slug')
  const db = getDb(c.env.DB)

  const cohort = await db.select().from(cohorts).where(eq(cohorts.slug, slug)).get()

  if (!cohort) {
    return c.html(
      <Layout title="Not Found">
        <div class="page-section" style="text-align: center; padding: 6rem 0;">
          <h2>Cohort not found</h2>
          <p><a href="/">← Back to homepage</a></p>
        </div>
      </Layout>,
      404
    )
  }

  // TODO: If !cohort.isPublic, check auth + enrollment
  // For now, only public cohorts are accessible

  const cohortLessons = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.cohortId, cohort.id), eq(lessons.status, 'published')))
    .orderBy(asc(lessons.sortOrder), asc(lessons.weekNumber))
    .all()

  const statusBadge = cohort.status === 'completed'
    ? <span class="badge badge-completed">Completed</span>
    : cohort.status === 'active'
    ? <span class="badge badge-active">Active</span>
    : null

  return c.html(
    <Layout title={cohort.title} description={cohort.description || undefined}>
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

        {cohortLessons.length > 0 ? (
          <div class="week-grid">
            {cohortLessons.map((lesson) => (
              <a href={`/cohort/${slug}/week/${lesson.weekNumber}`} class="week-card">
                <div class="week-card-info">
                  <h3>Week {lesson.weekNumber}: {lesson.title}</h3>
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
      </div>
    </Layout>
  )
})

// Lesson page — /cohort/:slug/week/:num
cohortRoutes.get('/cohort/:slug/week/:num', async (c) => {
  const slug = c.req.param('slug')
  const weekNum = parseInt(c.req.param('num'), 10)
  const db = getDb(c.env.DB)

  if (isNaN(weekNum)) {
    return c.redirect(`/cohort/${slug}`)
  }

  const cohort = await db.select().from(cohorts).where(eq(cohorts.slug, slug)).get()

  if (!cohort) {
    return c.html(
      <Layout title="Not Found">
        <div class="page-section" style="text-align: center; padding: 6rem 0;">
          <h2>Cohort not found</h2>
          <p><a href="/">← Back to homepage</a></p>
        </div>
      </Layout>,
      404
    )
  }

  // TODO: If !cohort.isPublic, check auth + enrollment

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
      <Layout title="Not Found">
        <div class="page-section" style="text-align: center; padding: 6rem 0;">
          <h2>Lesson not found</h2>
          <p><a href={`/cohort/${slug}`}>← Back to {cohort.title}</a></p>
        </div>
      </Layout>,
      404
    )
  }

  const renderedContent = renderMarkdown(lesson.contentMarkdown)

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

  return c.html(
    <Layout title={`Week ${weekNum}: ${lesson.title}`} description={lesson.description || undefined}>
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
