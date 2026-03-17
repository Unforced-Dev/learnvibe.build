import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// ===== USERS =====
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').notNull().default('student'), // 'student' | 'alumni' | 'facilitator' | 'admin'
  bio: text('bio'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== APPLICATIONS =====
export const applications = sqliteTable('applications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  background: text('background').notNull(),
  projectInterest: text('project_interest').notNull(),
  referralSource: text('referral_source').notNull(),
  cohortSlug: text('cohort_slug').notNull().default('cohort-2'),
  pricingTier: text('pricing_tier').notNull().default('pending'), // set by admin on approval
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
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
