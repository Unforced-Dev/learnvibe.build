import { Hono } from 'hono'
import { eq, and, desc, asc, ne, isNull } from 'drizzle-orm'
import { getDb } from '../db'
import {
  users, cohorts, lessons, enrollments, projects, discussions,
  comments, lessonProgress, apiKeys
} from '../db/schema'
import { authenticateApiKey } from '../lib/api-auth'
import { isAdmin } from '../lib/auth'
import type { AppContext } from '../types'
import type { AuthUser } from '../lib/auth'

const apiV1 = new Hono<AppContext>()

// ===== API DOCS (public) =====
apiV1.get('/api/v1/docs', (c) => {
  return c.json({
    name: 'Learn Vibe Build API',
    version: '1.0',
    baseUrl: 'https://learnvibe.build/api/v1',
    auth: 'Bearer token via Authorization header. Get your key at /settings/api-keys',
    endpoints: {
      'GET /api/v1/me': 'Your profile + enrollments',
      'PUT /api/v1/me': 'Update your profile (name, bio, location, website, github, avatarUrl)',
      'GET /api/v1/cohorts': 'List all cohorts',
      'GET /api/v1/cohorts/:slug': 'Get cohort details',
      'GET /api/v1/cohorts/:slug/lessons': 'List lessons + your progress',
      'GET /api/v1/cohorts/:slug/lessons/:weekNum': 'Get lesson with full markdown content',
      'GET /api/v1/cohorts/:slug/progress': 'Your progress for a cohort',
      'POST /api/v1/progress/:lessonId': 'Toggle lesson complete/incomplete',
      'GET /api/v1/projects': 'List projects (?limit=20&offset=0)',
      'GET /api/v1/projects/:id': 'Get project details',
      'POST /api/v1/projects': 'Create project (title, description, url?, githubUrl?, cohortId?)',
      'PUT /api/v1/projects/:id': 'Update your project',
      'GET /api/v1/discussions': 'List discussions (?cohort=slug for cohort-specific, omit for community-wide)',
      'GET /api/v1/discussions/:id': 'Get discussion with comments',
      'POST /api/v1/discussions': 'Create discussion (title, body, cohortId?, lessonId?)',
      'POST /api/v1/discussions/:id/comments': 'Add comment (body, parentId?)',
      'GET /api/v1/members': 'List community members',
      'GET /api/v1/members/:id': 'Get member profile + projects',
      'GET /api/v1/admin/cohorts/:slug/lessons': 'ADMIN — list all lessons including drafts',
      'GET /api/v1/admin/cohorts/:slug/lessons/:weekNum': 'ADMIN — get lesson (any status)',
      'PUT /api/v1/admin/cohorts/:slug/lessons/:weekNum': 'ADMIN — upsert lesson (title, description?, date?, contentMarkdown, status?)',
      'DELETE /api/v1/admin/cohorts/:slug/lessons/:weekNum': 'ADMIN — delete lesson',
    },
    mcpIntegration: 'Point your MCP server at these endpoints to let your AI pull lessons, push projects, and participate in discussions. Admin endpoints (lesson CRUD) require an API key issued to an admin user.',
  })
})

// ===== AUTH MIDDLEWARE =====
// All /api/v1/* routes require Bearer token auth
apiV1.use('/api/v1/*', async (c, next) => {
  // First try API key auth
  const apiUser = await authenticateApiKey(c)
  if (apiUser) {
    c.set('user', apiUser)
    return next()
  }

  // Fall back to session auth (for logged-in web users hitting JSON endpoints)
  const sessionUser = c.get('user')
  if (sessionUser) {
    return next()
  }

  return c.json({ error: 'Unauthorized', message: 'Provide a valid Bearer token via Authorization header' }, 401)
})

// Helper: get authenticated user from context
function getUser(c: any): AuthUser {
  return c.get('user') as AuthUser
}

// ===== ME: Current user profile =====
apiV1.get('/api/v1/me', async (c) => {
  const user = getUser(c)
  const db = getDb(c.env.DB)

  const profile = await db.select().from(users).where(eq(users.id, user.id)).get()
  if (!profile) return c.json({ error: 'User not found' }, 404)

  // Get enrollments
  const userEnrollments = await db
    .select({
      cohortId: enrollments.cohortId,
      cohortSlug: cohorts.slug,
      cohortTitle: cohorts.title,
      status: enrollments.status,
      enrolledAt: enrollments.enrolledAt,
    })
    .from(enrollments)
    .innerJoin(cohorts, eq(enrollments.cohortId, cohorts.id))
    .where(eq(enrollments.userId, user.id))
    .all()

  return c.json({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    website: profile.website,
    github: profile.github,
    location: profile.location,
    createdAt: profile.createdAt,
    enrollments: userEnrollments,
  })
})

// ===== COHORTS =====

// List cohorts
apiV1.get('/api/v1/cohorts', async (c) => {
  const db = getDb(c.env.DB)
  const allCohorts = await db.select().from(cohorts).orderBy(desc(cohorts.createdAt)).all()

  return c.json({
    cohorts: allCohorts.map(co => ({
      id: co.id,
      slug: co.slug,
      title: co.title,
      description: co.description,
      startDate: co.startDate,
      endDate: co.endDate,
      weeks: co.weeks,
      status: co.status,
      isPublic: !!co.isPublic,
    })),
  })
})

// Get cohort by slug
apiV1.get('/api/v1/cohorts/:slug', async (c) => {
  const slug = c.req.param('slug')
  const db = getDb(c.env.DB)

  const cohort = await db.select().from(cohorts).where(eq(cohorts.slug, slug)).get()
  if (!cohort) return c.json({ error: 'Cohort not found' }, 404)

  return c.json({
    id: cohort.id,
    slug: cohort.slug,
    title: cohort.title,
    description: cohort.description,
    startDate: cohort.startDate,
    endDate: cohort.endDate,
    weeks: cohort.weeks,
    status: cohort.status,
    isPublic: !!cohort.isPublic,
  })
})

// ===== LESSONS =====

// List lessons for a cohort
apiV1.get('/api/v1/cohorts/:slug/lessons', async (c) => {
  const slug = c.req.param('slug')
  const user = getUser(c)
  const db = getDb(c.env.DB)

  const cohort = await db.select().from(cohorts).where(eq(cohorts.slug, slug)).get()
  if (!cohort) return c.json({ error: 'Cohort not found' }, 404)

  const cohortLessons = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.cohortId, cohort.id), eq(lessons.status, 'published')))
    .orderBy(asc(lessons.weekNumber))
    .all()

  // Get user's progress
  const progress = await db
    .select({ lessonId: lessonProgress.lessonId })
    .from(lessonProgress)
    .where(
      and(eq(lessonProgress.userId, user.id), eq(lessonProgress.cohortId, cohort.id))
    )
    .all()
  const completedIds = new Set(progress.map(p => p.lessonId))

  return c.json({
    cohortId: cohort.id,
    cohortSlug: cohort.slug,
    lessons: cohortLessons.map(l => ({
      id: l.id,
      weekNumber: l.weekNumber,
      title: l.title,
      description: l.description,
      date: l.date,
      completed: completedIds.has(l.id),
    })),
    progress: {
      completed: completedIds.size,
      total: cohortLessons.length,
      percent: cohortLessons.length > 0
        ? Math.round((completedIds.size / cohortLessons.length) * 100)
        : 0,
    },
  })
})

// Get a single lesson with full content
apiV1.get('/api/v1/cohorts/:slug/lessons/:weekNum', async (c) => {
  const slug = c.req.param('slug')
  const weekNum = parseInt(c.req.param('weekNum'), 10)
  const user = getUser(c)
  const db = getDb(c.env.DB)

  const cohort = await db.select().from(cohorts).where(eq(cohorts.slug, slug)).get()
  if (!cohort) return c.json({ error: 'Cohort not found' }, 404)

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

  if (!lesson) return c.json({ error: 'Lesson not found' }, 404)

  // Check completion
  const prog = await db.select().from(lessonProgress)
    .where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lesson.id)))
    .get()

  return c.json({
    id: lesson.id,
    cohortSlug: slug,
    weekNumber: lesson.weekNumber,
    title: lesson.title,
    description: lesson.description,
    date: lesson.date,
    contentMarkdown: lesson.contentMarkdown,
    completed: !!prog,
    completedAt: prog?.completedAt || null,
  })
})

// ===== ADMIN LESSON CRUD =====
// Gated on user.role === 'admin' | 'facilitator'. Designed for MCP clients —
// an admin's API key is implicitly admin-scoped. The one big markdown field
// per lesson is the core primitive; everything else is metadata.

apiV1.use('/api/v1/admin/*', async (c, next) => {
  const user = getUser(c)
  if (!isAdmin(user)) {
    return c.json({ error: 'Admin required', message: 'This endpoint requires an admin account.' }, 403)
  }
  return next()
})

// List all lessons for a cohort, including drafts.
apiV1.get('/api/v1/admin/cohorts/:slug/lessons', async (c) => {
  const slug = c.req.param('slug')
  const db = getDb(c.env.DB)
  const cohort = await db.select().from(cohorts).where(eq(cohorts.slug, slug)).get()
  if (!cohort) return c.json({ error: 'Cohort not found' }, 404)

  const rows = await db.select()
    .from(lessons)
    .where(eq(lessons.cohortId, cohort.id))
    .orderBy(asc(lessons.weekNumber))
    .all()

  return c.json({
    cohortSlug: slug,
    lessons: rows.map(l => ({
      id: l.id,
      weekNumber: l.weekNumber,
      title: l.title,
      description: l.description,
      date: l.date,
      status: l.status,
      contentLength: l.contentMarkdown.length,
      updatedAt: l.updatedAt,
    })),
  })
})

// Get a single lesson (any status) for editing.
apiV1.get('/api/v1/admin/cohorts/:slug/lessons/:weekNum', async (c) => {
  const slug = c.req.param('slug')
  const weekNum = parseInt(c.req.param('weekNum'), 10)
  const db = getDb(c.env.DB)

  const cohort = await db.select().from(cohorts).where(eq(cohorts.slug, slug)).get()
  if (!cohort) return c.json({ error: 'Cohort not found' }, 404)

  const lesson = await db.select()
    .from(lessons)
    .where(and(eq(lessons.cohortId, cohort.id), eq(lessons.weekNumber, weekNum)))
    .get()

  if (!lesson) return c.json({ error: 'Lesson not found' }, 404)

  return c.json({
    id: lesson.id,
    cohortSlug: slug,
    weekNumber: lesson.weekNumber,
    title: lesson.title,
    description: lesson.description,
    date: lesson.date,
    status: lesson.status,
    contentMarkdown: lesson.contentMarkdown,
    sortOrder: lesson.sortOrder,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  })
})

// Upsert a lesson by (cohort, weekNumber). Creates if missing, updates otherwise.
// Body: { title?, description?, date?, contentMarkdown?, status?, sortOrder? }
// Any omitted field is left unchanged on update; on create, title is required.
apiV1.put('/api/v1/admin/cohorts/:slug/lessons/:weekNum', async (c) => {
  const slug = c.req.param('slug')
  const weekNum = parseInt(c.req.param('weekNum'), 10)
  if (Number.isNaN(weekNum) || weekNum < 1) {
    return c.json({ error: 'Invalid week number' }, 400)
  }

  const body = await c.req.json().catch(() => null) as {
    title?: string
    description?: string | null
    date?: string | null
    contentMarkdown?: string
    status?: 'draft' | 'published'
    sortOrder?: number
  } | null
  if (!body) return c.json({ error: 'Body must be valid JSON' }, 400)

  if (body.status && body.status !== 'draft' && body.status !== 'published') {
    return c.json({ error: "status must be 'draft' or 'published'" }, 400)
  }

  const db = getDb(c.env.DB)
  const cohort = await db.select().from(cohorts).where(eq(cohorts.slug, slug)).get()
  if (!cohort) return c.json({ error: 'Cohort not found' }, 404)

  const existing = await db.select()
    .from(lessons)
    .where(and(eq(lessons.cohortId, cohort.id), eq(lessons.weekNumber, weekNum)))
    .get()

  const now = new Date().toISOString()

  if (existing) {
    const updates: Record<string, any> = { updatedAt: now }
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.date !== undefined) updates.date = body.date
    if (body.contentMarkdown !== undefined) updates.contentMarkdown = body.contentMarkdown
    if (body.status !== undefined) updates.status = body.status
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder

    await db.update(lessons).set(updates).where(eq(lessons.id, existing.id))
    const updated = await db.select().from(lessons).where(eq(lessons.id, existing.id)).get()
    return c.json({ action: 'updated', lesson: updated })
  }

  if (!body.title) {
    return c.json({ error: 'title is required when creating a new lesson' }, 400)
  }

  const inserted = await db.insert(lessons).values({
    cohortId: cohort.id,
    weekNumber: weekNum,
    title: body.title,
    description: body.description ?? null,
    date: body.date ?? null,
    contentMarkdown: body.contentMarkdown ?? '',
    status: body.status ?? 'draft',
    sortOrder: body.sortOrder ?? weekNum,
    createdAt: now,
    updatedAt: now,
  }).returning().get()

  return c.json({ action: 'created', lesson: inserted })
})

apiV1.delete('/api/v1/admin/cohorts/:slug/lessons/:weekNum', async (c) => {
  const slug = c.req.param('slug')
  const weekNum = parseInt(c.req.param('weekNum'), 10)
  const db = getDb(c.env.DB)

  const cohort = await db.select().from(cohorts).where(eq(cohorts.slug, slug)).get()
  if (!cohort) return c.json({ error: 'Cohort not found' }, 404)

  const existing = await db.select()
    .from(lessons)
    .where(and(eq(lessons.cohortId, cohort.id), eq(lessons.weekNumber, weekNum)))
    .get()
  if (!existing) return c.json({ error: 'Lesson not found' }, 404)

  await db.delete(lessons).where(eq(lessons.id, existing.id))
  return c.json({ deleted: existing.id, weekNumber: weekNum })
})

// ===== PROGRESS =====

// Toggle lesson progress
apiV1.post('/api/v1/progress/:lessonId', async (c) => {
  const user = getUser(c)
  const lessonId = parseInt(c.req.param('lessonId'), 10)
  const db = getDb(c.env.DB)

  // Get the lesson to find cohortId
  const lesson = await db.select().from(lessons).where(eq(lessons.id, lessonId)).get()
  if (!lesson) return c.json({ error: 'Lesson not found' }, 404)

  const existing = await db.select().from(lessonProgress)
    .where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lessonId)))
    .get()

  if (existing) {
    await db.delete(lessonProgress).where(eq(lessonProgress.id, existing.id))
    return c.json({ completed: false, lessonId, message: 'Progress removed' })
  } else {
    const result = await db.insert(lessonProgress).values({
      userId: user.id,
      lessonId,
      cohortId: lesson.cohortId,
    }).returning()
    return c.json({ completed: true, lessonId, completedAt: result[0].completedAt, message: 'Lesson marked complete' })
  }
})

// Get progress for a cohort
apiV1.get('/api/v1/cohorts/:slug/progress', async (c) => {
  const slug = c.req.param('slug')
  const user = getUser(c)
  const db = getDb(c.env.DB)

  const cohort = await db.select().from(cohorts).where(eq(cohorts.slug, slug)).get()
  if (!cohort) return c.json({ error: 'Cohort not found' }, 404)

  const cohortLessons = await db.select({ id: lessons.id, weekNumber: lessons.weekNumber, title: lessons.title })
    .from(lessons)
    .where(and(eq(lessons.cohortId, cohort.id), eq(lessons.status, 'published')))
    .orderBy(asc(lessons.weekNumber))
    .all()

  const progress = await db.select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.cohortId, cohort.id)))
    .all()
  const completedMap = new Map(progress.map(p => [p.lessonId, p.completedAt]))

  return c.json({
    cohortSlug: slug,
    lessons: cohortLessons.map(l => ({
      id: l.id,
      weekNumber: l.weekNumber,
      title: l.title,
      completed: completedMap.has(l.id),
      completedAt: completedMap.get(l.id) || null,
    })),
    summary: {
      completed: completedMap.size,
      total: cohortLessons.length,
      percent: cohortLessons.length > 0
        ? Math.round((completedMap.size / cohortLessons.length) * 100)
        : 0,
    },
  })
})

// ===== PROJECTS =====

// List projects
apiV1.get('/api/v1/projects', async (c) => {
  const db = getDb(c.env.DB)
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const offset = parseInt(c.req.query('offset') || '0')

  const allProjects = await db
    .select({
      project: projects,
      author: { name: users.name, id: users.id },
    })
    .from(projects)
    .innerJoin(users, eq(projects.userId, users.id))
    .where(eq(projects.status, 'active'))
    .orderBy(desc(projects.createdAt))
    .limit(limit)
    .offset(offset)
    .all()

  return c.json({
    projects: allProjects.map(({ project: p, author }) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      url: p.url,
      githubUrl: p.githubUrl,
      cohortId: p.cohortId,
      author: { id: author.id, name: author.name },
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  })
})

// Get project by ID
apiV1.get('/api/v1/projects/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const db = getDb(c.env.DB)

  const result = await db
    .select({
      project: projects,
      author: { name: users.name, id: users.id },
    })
    .from(projects)
    .innerJoin(users, eq(projects.userId, users.id))
    .where(eq(projects.id, id))
    .get()

  if (!result || result.project.status !== 'active') {
    return c.json({ error: 'Project not found' }, 404)
  }

  const { project: p, author } = result
  return c.json({
    id: p.id,
    title: p.title,
    description: p.description,
    url: p.url,
    githubUrl: p.githubUrl,
    cohortId: p.cohortId,
    author: { id: author.id, name: author.name },
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  })
})

// Create project
apiV1.post('/api/v1/projects', async (c) => {
  const user = getUser(c)
  const body = await c.req.json<{
    title: string
    description: string
    url?: string
    githubUrl?: string
    cohortId?: number
  }>()

  if (!body.title || !body.description) {
    return c.json({ error: 'title and description are required' }, 400)
  }

  const db = getDb(c.env.DB)
  const result = await db.insert(projects).values({
    userId: user.id,
    title: body.title,
    description: body.description,
    url: body.url || null,
    githubUrl: body.githubUrl || null,
    cohortId: body.cohortId || null,
  }).returning()

  return c.json(result[0], 201)
})

// Update project
apiV1.put('/api/v1/projects/:id', async (c) => {
  const user = getUser(c)
  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.json<{
    title?: string
    description?: string
    url?: string | null
    githubUrl?: string | null
  }>()

  const db = getDb(c.env.DB)
  const project = await db.select().from(projects).where(eq(projects.id, id)).get()

  if (!project || (project.userId !== user.id && user.role !== 'admin' && user.role !== 'facilitator')) {
    return c.json({ error: 'Not found or unauthorized' }, 404)
  }

  await db.update(projects).set({
    ...(body.title !== undefined && { title: body.title }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.url !== undefined && { url: body.url }),
    ...(body.githubUrl !== undefined && { githubUrl: body.githubUrl }),
    updatedAt: new Date().toISOString(),
  }).where(eq(projects.id, id))

  const updated = await db.select().from(projects).where(eq(projects.id, id)).get()
  return c.json(updated)
})

// ===== DISCUSSIONS =====

// List discussions (community-wide or per-cohort)
apiV1.get('/api/v1/discussions', async (c) => {
  const db = getDb(c.env.DB)
  const cohortSlug = c.req.query('cohort')
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)

  let cohortId: number | null = null
  if (cohortSlug) {
    const cohort = await db.select().from(cohorts).where(eq(cohorts.slug, cohortSlug)).get()
    if (!cohort) return c.json({ error: 'Cohort not found' }, 404)
    cohortId = cohort.id
  }

  const query = db
    .select({
      discussion: discussions,
      author: { name: users.name, id: users.id },
    })
    .from(discussions)
    .innerJoin(users, eq(discussions.userId, users.id))
    .where(
      and(
        eq(discussions.status, 'active'),
        cohortId !== null ? eq(discussions.cohortId, cohortId) : isNull(discussions.cohortId)
      )
    )
    .orderBy(desc(discussions.isPinned), desc(discussions.createdAt))
    .limit(limit)

  const results = await query.all()

  return c.json({
    discussions: results.map(({ discussion: d, author }) => ({
      id: d.id,
      title: d.title,
      body: d.body,
      cohortId: d.cohortId,
      lessonId: d.lessonId,
      isPinned: !!d.isPinned,
      author: { id: author.id, name: author.name },
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
  })
})

// Get discussion with comments
apiV1.get('/api/v1/discussions/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const db = getDb(c.env.DB)

  const result = await db
    .select({
      discussion: discussions,
      author: { name: users.name, id: users.id },
    })
    .from(discussions)
    .innerJoin(users, eq(discussions.userId, users.id))
    .where(and(eq(discussions.id, id), eq(discussions.status, 'active')))
    .get()

  if (!result) return c.json({ error: 'Discussion not found' }, 404)

  const threadComments = await db
    .select({
      comment: comments,
      author: { name: users.name, id: users.id },
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(and(eq(comments.discussionId, id), eq(comments.status, 'active')))
    .orderBy(comments.createdAt)
    .all()

  const { discussion: d, author } = result
  return c.json({
    id: d.id,
    title: d.title,
    body: d.body,
    cohortId: d.cohortId,
    lessonId: d.lessonId,
    isPinned: !!d.isPinned,
    author: { id: author.id, name: author.name },
    createdAt: d.createdAt,
    comments: threadComments.map(({ comment: cm, author: ca }) => ({
      id: cm.id,
      body: cm.body,
      parentId: cm.parentId,
      author: { id: ca.id, name: ca.name },
      createdAt: cm.createdAt,
    })),
  })
})

// Create discussion
apiV1.post('/api/v1/discussions', async (c) => {
  const user = getUser(c)
  const body = await c.req.json<{
    title: string
    body: string
    cohortId?: number | null
    lessonId?: number | null
  }>()

  if (!body.title || !body.body) {
    return c.json({ error: 'title and body are required' }, 400)
  }

  const db = getDb(c.env.DB)
  const result = await db.insert(discussions).values({
    userId: user.id,
    title: body.title,
    body: body.body,
    cohortId: body.cohortId || null,
    lessonId: body.lessonId || null,
  }).returning()

  return c.json(result[0], 201)
})

// ===== COMMENTS =====

// Add comment to discussion
apiV1.post('/api/v1/discussions/:id/comments', async (c) => {
  const user = getUser(c)
  const discussionId = parseInt(c.req.param('id'), 10)
  const body = await c.req.json<{
    body: string
    parentId?: number | null
  }>()

  if (!body.body) {
    return c.json({ error: 'body is required' }, 400)
  }

  const db = getDb(c.env.DB)

  // Verify discussion exists
  const discussion = await db.select().from(discussions)
    .where(and(eq(discussions.id, discussionId), eq(discussions.status, 'active')))
    .get()
  if (!discussion) return c.json({ error: 'Discussion not found' }, 404)
  if (discussion.status === 'locked') return c.json({ error: 'Discussion is locked' }, 403)

  const result = await db.insert(comments).values({
    discussionId,
    userId: user.id,
    body: body.body,
    parentId: body.parentId || null,
  }).returning()

  return c.json(result[0], 201)
})

// ===== MEMBERS =====

// List members
apiV1.get('/api/v1/members', async (c) => {
  const db = getDb(c.env.DB)

  const members = await db
    .selectDistinct({
      id: users.id,
      name: users.name,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      location: users.location,
      github: users.github,
      website: users.website,
      role: users.role,
    })
    .from(users)
    .innerJoin(enrollments, eq(users.id, enrollments.userId))
    .where(ne(enrollments.status, 'dropped'))
    .orderBy(users.name)
    .all()

  return c.json({ members })
})

// Get member by ID
apiV1.get('/api/v1/members/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  const db = getDb(c.env.DB)

  const member = await db.select({
    id: users.id,
    name: users.name,
    bio: users.bio,
    avatarUrl: users.avatarUrl,
    location: users.location,
    github: users.github,
    website: users.website,
    role: users.role,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, id)).get()

  if (!member) return c.json({ error: 'Member not found' }, 404)

  // Get their projects
  const memberProjects = await db.select({
    id: projects.id,
    title: projects.title,
    description: projects.description,
    url: projects.url,
    githubUrl: projects.githubUrl,
  }).from(projects)
    .where(and(eq(projects.userId, id), eq(projects.status, 'active')))
    .orderBy(desc(projects.createdAt))
    .all()

  return c.json({ ...member, projects: memberProjects })
})

// ===== PROFILE: Update my profile =====
apiV1.put('/api/v1/me', async (c) => {
  const user = getUser(c)
  const body = await c.req.json<{
    name?: string
    bio?: string | null
    location?: string | null
    website?: string | null
    github?: string | null
    avatarUrl?: string | null
  }>()

  const db = getDb(c.env.DB)
  await db.update(users).set({
    ...(body.name !== undefined && { name: body.name }),
    ...(body.bio !== undefined && { bio: body.bio }),
    ...(body.location !== undefined && { location: body.location }),
    ...(body.website !== undefined && { website: body.website }),
    ...(body.github !== undefined && { github: body.github }),
    ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
    updatedAt: new Date().toISOString(),
  }).where(eq(users.id, user.id))

  const updated = await db.select().from(users).where(eq(users.id, user.id)).get()
  return c.json({
    id: updated!.id,
    email: updated!.email,
    name: updated!.name,
    bio: updated!.bio,
    location: updated!.location,
    website: updated!.website,
    github: updated!.github,
    avatarUrl: updated!.avatarUrl,
  })
})

export default apiV1
