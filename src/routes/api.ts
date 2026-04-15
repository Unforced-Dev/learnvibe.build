import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { applications, lessons, feedback, users, projects, lessonProgress, discussions, comments, apiKeys } from '../db/schema'
import { getDb } from '../db'
import { isAdmin } from '../lib/auth'
import { generateApiKey, hashApiKey, getKeyPrefix } from '../lib/api-auth'
import { sendApplicationReceived } from '../lib/email'
import type { AppContext } from '../types'

const api = new Hono<AppContext>()

// ===== PUBLIC: Application submission =====
api.post('/api/applications', async (c) => {
  const body = await c.req.parseBody()

  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim()
  const background = String(body.background || '').trim()
  const projectInterest = String(body.project_interest || '').trim()
  const referralSource = String(body.referral_source || '').trim()
  const contribution = String(body.contribution || 'full').trim()
  const requestedAmountRaw = String(body.requested_amount || '').trim()
  const requestedReason = String(body.requested_reason || '').trim() || null

  // Validate required fields
  if (!name || !email || !background || !projectInterest || !referralSource) {
    return c.redirect('/apply?error=missing_fields')
  }

  if (!email.includes('@') || !email.includes('.')) {
    return c.redirect('/apply?error=invalid_email')
  }

  // Pay-what-you-can: if the applicant chose custom contribution, parse + clamp.
  let requestedAmountCents: number | null = null
  if (contribution === 'pwyc') {
    const dollars = parseInt(requestedAmountRaw || '0', 10)
    if (Number.isNaN(dollars) || dollars < 0 || dollars > 500) {
      return c.redirect('/apply?error=invalid_amount')
    }
    requestedAmountCents = dollars * 100
  }

  try {
    const db = getDb(c.env.DB)

    // Check for existing application with this email
    const existing = await db.select({ id: applications.id })
      .from(applications)
      .where(eq(applications.email, email.toLowerCase()))
      .get()

    if (existing) {
      return c.redirect('/apply/status')
    }

    await db.insert(applications).values({
      name,
      email: email.toLowerCase(),
      background,
      projectInterest,
      referralSource,
      cohortSlug: 'cohort-1',
      pricingTier: 'pending',
      requestedAmountCents,
      requestedAmountReason: requestedAmountCents != null ? requestedReason : null,
    })

    // Send confirmation email (non-blocking — don't fail the request if email fails)
    c.executionCtx.waitUntil(
      sendApplicationReceived(c.env, email, name)
    )

    return c.redirect('/apply/success')
  } catch (error) {
    console.error('Failed to save application:', error)
    return c.redirect('/apply?error=server_error')
  }
})

// ===== ADMIN: Create lesson =====
api.post('/api/admin/lessons', async (c) => {
  const user = c.get('user')
  if (!isAdmin(user)) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const body = await c.req.parseBody()
  const cohortId = parseInt(String(body.cohort_id || '0'), 10)
  const weekNumber = parseInt(String(body.week_number || '0'), 10)
  const title = String(body.title || '').trim()
  const description = String(body.description || '').trim()
  const date = String(body.date || '').trim()
  const contentMarkdown = String(body.content_markdown || '')
  const status = String(body.status || 'draft')

  if (!cohortId || !weekNumber || !title) {
    return c.redirect('/admin/lessons/new?error=missing_fields')
  }

  try {
    const db = getDb(c.env.DB)
    const result = await db.insert(lessons).values({
      cohortId,
      weekNumber,
      title,
      description: description || null,
      date: date || null,
      contentMarkdown,
      status,
      sortOrder: weekNumber,
    }).returning()

    return c.redirect(`/admin/lessons/${result[0].id}/edit`)
  } catch (error) {
    console.error('Failed to create lesson:', error)
    return c.redirect('/admin/lessons/new?error=server_error')
  }
})

// ===== ADMIN: Update lesson =====
api.post('/api/admin/lessons/:id', async (c) => {
  const user = c.get('user')
  if (!isAdmin(user)) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.parseBody()
  const cohortId = parseInt(String(body.cohort_id || '0'), 10)
  const weekNumber = parseInt(String(body.week_number || '0'), 10)
  const title = String(body.title || '').trim()
  const description = String(body.description || '').trim()
  const date = String(body.date || '').trim()
  const contentMarkdown = String(body.content_markdown || '')
  const status = String(body.status || 'draft')

  if (!cohortId || !weekNumber || !title) {
    return c.redirect(`/admin/lessons/${id}/edit?error=missing_fields`)
  }

  try {
    const db = getDb(c.env.DB)
    await db.update(lessons)
      .set({
        cohortId,
        weekNumber,
        title,
        description: description || null,
        date: date || null,
        contentMarkdown,
        status,
        sortOrder: weekNumber,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(lessons.id, id))

    return c.redirect(`/admin/lessons/${id}/edit?saved=true`)
  } catch (error) {
    console.error('Failed to update lesson:', error)
    return c.redirect(`/admin/lessons/${id}/edit?error=server_error`)
  }
})

// ===== PUBLIC: Feedback submission =====
api.post('/api/feedback', async (c) => {
  const body = await c.req.parseBody()

  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim()
  const cohortSlug = String(body.cohort_slug || '').trim() || null
  const ratingStr = String(body.rating || '').trim()
  const rating = ratingStr ? parseInt(ratingStr, 10) : null
  const highlight = String(body.highlight || '').trim() || null
  const testimonial = String(body.testimonial || '').trim() || null
  const improvement = String(body.improvement || '').trim() || null
  const canFeatureStr = String(body.can_feature || '0')
  // 0 = private, 1 = full name + link, 2 = anonymous, 3 = first name only
  const canFeature = ['1', '2', '3'].includes(canFeatureStr) ? parseInt(canFeatureStr, 10) : 0
  const website = String(body.website || '').trim() || null

  if (!name || !email || (!highlight && !testimonial && !improvement)) {
    return c.redirect('/feedback?error=missing_fields')
  }

  try {
    const db = getDb(c.env.DB)
    await db.insert(feedback).values({
      name,
      email,
      cohortSlug,
      rating,
      highlight,
      testimonial,
      improvement,
      canFeature,
      website,
    })

    return c.redirect('/feedback?submitted=true')
  } catch (error) {
    console.error('Failed to save feedback:', error)
    return c.redirect('/feedback?error=server_error')
  }
})

// ===== PROFILE: Update your profile =====
api.post('/api/profile', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/sign-in')

  const body = await c.req.parseBody()

  const name = String(body.name || '').trim()
  const bio = String(body.bio || '').trim() || null
  const location = String(body.location || '').trim() || null
  const website = String(body.website || '').trim() || null
  const github = String(body.github || '').trim() || null
  const avatarUrl = String(body.avatar_url || '').trim() || null

  if (!name) {
    return c.redirect('/settings/profile?error=missing_fields')
  }

  try {
    const db = getDb(c.env.DB)
    await db.update(users)
      .set({
        name,
        bio,
        location,
        website,
        github,
        avatarUrl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id))

    return c.redirect('/settings/profile?saved=true')
  } catch (error) {
    console.error('Failed to update profile:', error)
    return c.redirect('/settings/profile?error=server_error')
  }
})

// ===== PROJECTS: Create a project =====
api.post('/api/projects', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/sign-in')

  const body = await c.req.parseBody()

  const title = String(body.title || '').trim()
  const description = String(body.description || '').trim()
  const url = String(body.url || '').trim() || null
  const githubUrl = String(body.github_url || '').trim() || null
  const cohortIdStr = String(body.cohort_id || '').trim()
  const cohortId = cohortIdStr ? parseInt(cohortIdStr, 10) : null

  if (!title || !description) {
    return c.redirect('/projects/new?error=missing_fields')
  }

  try {
    const db = getDb(c.env.DB)
    const result = await db.insert(projects).values({
      userId: user.id,
      title,
      description,
      url,
      githubUrl,
      cohortId,
    }).returning()

    return c.redirect(`/projects/${result[0].id}`)
  } catch (error) {
    console.error('Failed to create project:', error)
    return c.redirect('/projects/new?error=server_error')
  }
})

// ===== PROJECTS: Update a project =====
api.post('/api/projects/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/sign-in')

  const id = parseInt(c.req.param('id'), 10)
  const body = await c.req.parseBody()

  const title = String(body.title || '').trim()
  const description = String(body.description || '').trim()
  const url = String(body.url || '').trim() || null
  const githubUrl = String(body.github_url || '').trim() || null
  const cohortIdStr = String(body.cohort_id || '').trim()
  const cohortId = cohortIdStr ? parseInt(cohortIdStr, 10) : null

  if (!title || !description) {
    return c.redirect(`/projects/${id}/edit?error=missing_fields`)
  }

  try {
    const db = getDb(c.env.DB)

    // Verify ownership (or admin)
    const project = await db.select().from(projects).where(eq(projects.id, id)).get()
    if (!project || (project.userId !== user.id && !isAdmin(user))) {
      return c.redirect('/projects')
    }

    await db.update(projects)
      .set({
        title,
        description,
        url,
        githubUrl,
        cohortId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projects.id, id))

    return c.redirect(`/projects/${id}`)
  } catch (error) {
    console.error('Failed to update project:', error)
    return c.redirect(`/projects/${id}/edit?error=server_error`)
  }
})

// ===== PROGRESS: Toggle lesson complete/incomplete =====
api.post('/api/progress/:lessonId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const lessonId = parseInt(c.req.param('lessonId'), 10)
  const body = await c.req.parseBody()
  const cohortId = parseInt(String(body.cohort_id || '0'), 10)
  const rawReturnUrl = String(body.return_url || '/dashboard')
  const returnUrl = rawReturnUrl.startsWith('/') && !rawReturnUrl.startsWith('//') ? rawReturnUrl : '/dashboard'

  if (isNaN(lessonId) || !cohortId) {
    return c.redirect(returnUrl)
  }

  try {
    const db = getDb(c.env.DB)

    // Check if already completed
    const existing = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, user.id),
          eq(lessonProgress.lessonId, lessonId)
        )
      )
      .get()

    if (existing) {
      // Toggle off — remove the progress record
      await db.delete(lessonProgress).where(eq(lessonProgress.id, existing.id))
    } else {
      // Toggle on — create a progress record
      await db.insert(lessonProgress).values({
        userId: user.id,
        lessonId,
        cohortId,
      })
    }

    return c.redirect(returnUrl)
  } catch (error) {
    console.error('Failed to toggle progress:', error)
    return c.redirect(returnUrl)
  }
})

// ===== DISCUSSIONS: Create a discussion =====
api.post('/api/discussions', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/sign-in')

  const body = await c.req.parseBody()

  const title = String(body.title || '').trim()
  const discussionBody = String(body.body || '').trim()
  const cohortIdStr = String(body.cohort_id || '').trim()
  const cohortId = cohortIdStr ? parseInt(cohortIdStr, 10) : null
  const lessonIdStr = String(body.lesson_id || '').trim()
  const lessonId = lessonIdStr ? parseInt(lessonIdStr, 10) : null
  const returnSlug = String(body.return_slug || '').trim()
  const returnCommunity = String(body.return_community || '').trim()

  if (!title || !discussionBody) {
    if (returnSlug) {
      return c.redirect(`/cohort/${returnSlug}/discussions/new?error=missing_fields`)
    }
    return c.redirect('/community/discussions/new?error=missing_fields')
  }

  try {
    const db = getDb(c.env.DB)
    const result = await db.insert(discussions).values({
      cohortId,
      lessonId,
      userId: user.id,
      title,
      body: discussionBody,
    }).returning()

    if (returnSlug) {
      return c.redirect(`/cohort/${returnSlug}/discussions/${result[0].id}`)
    }
    return c.redirect(`/community/discussions/${result[0].id}`)
  } catch (error) {
    console.error('Failed to create discussion:', error)
    if (returnSlug) {
      return c.redirect(`/cohort/${returnSlug}/discussions/new?error=server_error`)
    }
    return c.redirect('/community/discussions/new?error=server_error')
  }
})

// ===== DISCUSSIONS: Add a comment =====
api.post('/api/discussions/:id/comments', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/sign-in')

  const discussionId = parseInt(c.req.param('id'), 10)
  const body = await c.req.parseBody()

  const commentBody = String(body.body || '').trim()
  const parentIdStr = String(body.parent_id || '').trim()
  const parentId = parentIdStr ? parseInt(parentIdStr, 10) : null
  const rawReturnUrl = String(body.return_url || '/community/discussions')
  const returnUrl = rawReturnUrl.startsWith('/') && !rawReturnUrl.startsWith('//') ? rawReturnUrl : '/community/discussions'

  if (!commentBody) {
    return c.redirect(returnUrl)
  }

  try {
    const db = getDb(c.env.DB)
    await db.insert(comments).values({
      discussionId,
      userId: user.id,
      parentId,
      body: commentBody,
    })

    return c.redirect(returnUrl)
  } catch (error) {
    console.error('Failed to add comment:', error)
    return c.redirect(returnUrl)
  }
})

// ===== API KEYS: Create an API key =====
api.post('/api/api-keys', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/sign-in')

  const body = await c.req.parseBody()
  const name = String(body.name || '').trim()

  if (!name) {
    return c.redirect('/settings/api-keys?error=missing_name')
  }

  try {
    const rawKey = generateApiKey()
    const keyHash = await hashApiKey(rawKey)
    const keyPrefix = getKeyPrefix(rawKey)

    const db = getDb(c.env.DB)
    await db.insert(apiKeys).values({
      userId: user.id,
      name,
      keyHash,
      keyPrefix,
      scopes: 'read:write',
    })

    // Show the raw key once — pass it in the URL (HTTPS protects it in transit)
    return c.redirect(`/settings/api-keys?new_key=${encodeURIComponent(rawKey)}`)
  } catch (error) {
    console.error('Failed to create API key:', error)
    return c.redirect('/settings/api-keys?error=server_error')
  }
})

// ===== API KEYS: Revoke an API key =====
api.post('/api/api-keys/:id/revoke', async (c) => {
  const user = c.get('user')
  if (!user) return c.redirect('/sign-in')

  const id = parseInt(c.req.param('id'), 10)

  try {
    const db = getDb(c.env.DB)

    // Verify ownership
    const key = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).get()
    if (!key || key.userId !== user.id) {
      return c.redirect('/settings/api-keys')
    }

    await db.update(apiKeys)
      .set({ status: 'revoked' })
      .where(eq(apiKeys.id, id))

    return c.redirect('/settings/api-keys?revoked=true')
  } catch (error) {
    console.error('Failed to revoke API key:', error)
    return c.redirect('/settings/api-keys')
  }
})

export default api
