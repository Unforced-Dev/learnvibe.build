import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// ===== USERS =====
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').notNull().default('student'), // 'student' | 'alumni' | 'facilitator' | 'admin'
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  website: text('website'),
  github: text('github'),
  location: text('location'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at'),
})

// ===== APPLICATIONS =====
export const applications = sqliteTable('applications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  background: text('background').notNull(),
  projectInterest: text('project_interest').notNull(),
  referralSource: text('referral_source').notNull(),
  cohortSlug: text('cohort_slug').notNull().default('cohort-1'),
  pricingTier: text('pricing_tier').notNull().default('pending'), // set by admin on approval (kept for label/back-compat)
  /** Custom amount in cents. If set, overrides the tier's default amount (enables dynamic pricing). */
  approvedAmountCents: integer('approved_amount_cents'),
  /** Pay-what-you-can: amount the applicant asked to contribute (cents). Null = paying full price. */
  requestedAmountCents: integer('requested_amount_cents'),
  /** Pay-what-you-can: optional reasoning the applicant shared for a lower contribution. */
  requestedAmountReason: text('requested_amount_reason'),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected' | 'enrolled'
  notes: text('notes'), // admin notes
  approvedAt: text('approved_at'), // ISO timestamp
  userId: integer('user_id').references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== COHORTS =====
export const cohorts = sqliteTable('cohorts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  courseCode: text('course_code'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  weeks: integer('weeks').notNull(),
  priceCents: integer('price_cents').notNull(),
  isPublic: integer('is_public').notNull().default(0), // 1 = content visible without auth
  status: text('status').notNull().default('upcoming'), // 'upcoming' | 'enrolling' | 'active' | 'completed'
  /** Live session URL (Zoom / Meet / etc). Shown to enrolled members on dashboard + cohort page. */
  meetingUrl: text('meeting_url'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== LESSONS =====
export const lessons = sqliteTable('lessons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cohortId: integer('cohort_id').notNull().references(() => cohorts.id),
  weekNumber: integer('week_number').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  date: text('date'), // ISO date for the session
  contentMarkdown: text('content_markdown').notNull().default(''),
  status: text('status').notNull().default('draft'), // 'draft' | 'published'
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== ENROLLMENTS =====
export const enrollments = sqliteTable('enrollments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  cohortId: integer('cohort_id').notNull().references(() => cohorts.id),
  status: text('status').notNull().default('active'), // 'active' | 'completed' | 'dropped'
  enrolledAt: text('enrolled_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== MEMBERSHIPS =====
export const memberships = sqliteTable('memberships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type').notNull().default('cohort_alumni'), // 'community' | 'cohort_alumni'
  status: text('status').notNull().default('active'), // 'active' | 'expired' | 'cancelled'
  startedAt: text('started_at').notNull().$defaultFn(() => new Date().toISOString()),
  expiresAt: text('expires_at'), // nullable — for paid memberships
})

// ===== FEEDBACK =====
export const feedback = sqliteTable('feedback', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  cohortSlug: text('cohort_slug'), // e.g. 'cohort-1'
  rating: integer('rating'), // 1-5
  highlight: text('highlight'), // "What was the best part?"
  testimonial: text('testimonial'), // quotable testimonial text
  improvement: text('improvement'), // "What could be better?"
  canFeature: integer('can_feature').notNull().default(0), // 0 = private, 1 = named+linked, 2 = anonymous
  website: text('website'), // URL to link in testimonial attribution
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== PAYMENTS =====
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  applicationId: integer('application_id').references(() => applications.id),
  cohortId: integer('cohort_id').references(() => cohorts.id),
  stripeCheckoutSessionId: text('stripe_checkout_session_id').unique(),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('usd'),
  status: text('status').notNull().default('pending'), // 'pending' | 'completed' | 'failed' | 'refunded'
  paidAt: text('paid_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== PROJECTS =====
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description').notNull(), // markdown
  url: text('url'), // live project URL
  githubUrl: text('github_url'), // GitHub repo URL
  cohortId: integer('cohort_id').references(() => cohorts.id),
  status: text('status').notNull().default('active'), // 'active' | 'archived'
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== DISCUSSIONS =====
export const discussions = sqliteTable('discussions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cohortId: integer('cohort_id').references(() => cohorts.id), // nullable = community-wide discussion
  lessonId: integer('lesson_id').references(() => lessons.id), // nullable = general (not lesson-specific)
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  body: text('body').notNull(), // markdown
  isPinned: integer('is_pinned').notNull().default(0), // 1 = pinned by facilitator
  status: text('status').notNull().default('active'), // 'active' | 'locked' | 'deleted'
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== COMMENTS =====
export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  discussionId: integer('discussion_id').notNull().references(() => discussions.id),
  userId: integer('user_id').notNull().references(() => users.id),
  parentId: integer('parent_id'), // nullable self-ref for one level of threading
  body: text('body').notNull(), // markdown
  status: text('status').notNull().default('active'), // 'active' | 'deleted'
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== LESSON PROGRESS =====
export const lessonProgress = sqliteTable('lesson_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  lessonId: integer('lesson_id').notNull().references(() => lessons.id),
  cohortId: integer('cohort_id').notNull().references(() => cohorts.id),
  completedAt: text('completed_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== EMAIL LOG =====
export const emailLog = sqliteTable('email_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  to: text('to').notNull(), // recipient email
  subject: text('subject').notNull(),
  template: text('template').notNull(), // e.g. 'application_received', 'application_approved', 'broadcast'
  status: text('status').notNull().default('sent'), // 'sent' | 'failed'
  error: text('error'), // error message if failed
  sentAt: text('sent_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== API KEYS =====
export const apiKeys = sqliteTable('api_keys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(), // user-friendly label, e.g. "My MCP Server"
  keyHash: text('key_hash').notNull().unique(), // SHA-256 hash of the key
  keyPrefix: text('key_prefix').notNull(), // first 8 chars for display, e.g. "lvb_a1b2..."
  scopes: text('scopes').notNull().default('read'), // 'read' | 'read:write' | 'admin'
  lastUsedAt: text('last_used_at'),
  expiresAt: text('expires_at'), // nullable = no expiry
  status: text('status').notNull().default('active'), // 'active' | 'revoked'
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})
