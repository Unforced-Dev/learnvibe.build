import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').notNull().default('student'), // 'student' | 'alumni' | 'facilitator' | 'admin'
  bio: text('bio'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const applications = sqliteTable('applications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  background: text('background').notNull(),
  projectInterest: text('project_interest').notNull(),
  referralSource: text('referral_source').notNull(),
  cohortSlug: text('cohort_slug').notNull().default('cohort-2'),
  pricingTier: text('pricing_tier').notNull(), // 'full' | 'alumni' | 'regenhub_member' | 'core_member'
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  userId: integer('user_id').references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const cohorts = sqliteTable('cohorts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  courseCode: text('course_code'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  weeks: integer('weeks').notNull(),
  priceCents: integer('price_cents').notNull(),
  status: text('status').notNull().default('upcoming'), // 'upcoming' | 'enrolling' | 'active' | 'completed'
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})
