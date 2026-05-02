import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core'

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
  /** Random token required on /payment/checkout/:id so sequential ids can't be guessed. */
  paymentToken: text('payment_token'),
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
  recordingUrl: text('recording_url'), // YouTube auto-embeds; any other URL renders as link
  transcriptMarkdown: text('transcript_markdown'), // collapsible section below the lesson
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
}, (t) => ({
  userCohortUnique: uniqueIndex('enrollments_user_cohort_unique').on(t.userId, t.cohortId),
}))

// ===== MEMBERSHIPS =====
export const memberships = sqliteTable('memberships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type').notNull().default('cohort_alumni'), // 'community' | 'cohort_alumni'
  status: text('status').notNull().default('active'), // 'active' | 'expired' | 'cancelled'
  startedAt: text('started_at').notNull().$defaultFn(() => new Date().toISOString()),
  expiresAt: text('expires_at'), // nullable — for paid memberships
}, (t) => ({
  userTypeUnique: uniqueIndex('memberships_user_type_unique').on(t.userId, t.type),
}))

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
}, (t) => ({
  applicationIdIdx: index('payments_application_id').on(t.applicationId),
}))

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
  /** Rendered HTML of the email body (post-substitution + post-emailWrapper).
   *  Stored so admin can view what actually went out, and so failed sends can
   *  be re-fired identically. NULL on rows logged before this column existed. */
  bodyHtml: text('body_html'),
  sentAt: text('sent_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== INTEREST LIST =====
// Soft signups when applications aren't open. Captures email + (optional)
// name + a list of which threads of LVB the person wants to be looped in
// on (next cohort, alumni community, CU class, vibecoding events). Synced
// to a Resend audience so we can broadcast updates as Cohort 2 takes
// shape. See issue #35.
export const interests = sqliteTable('interests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  name: text('name'),
  /** Path the signup came from — '/', '/apply', '/community', etc. Useful
   *  for "where do these people land first?" admin questions. */
  sourcePath: text('source_path'),
  /** JSON array of interest tags. Subset of:
   *    'next_cohort' | 'alumni' | 'cu_class' | 'events'
   *  Stored as JSON so the set can grow without a schema migration. */
  interestsJson: text('interests_json').notNull().default('[]'),
  /** Resend Audiences contact id, returned from the audience-add call.
   *  Stored so admin can later sync (remove on unsubscribe, retry adds
   *  that failed). NULL when the audience-add hasn't happened yet or
   *  failed silently. */
  resendContactId: text('resend_contact_id'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== EMAIL TEMPLATES =====
// Admin-editable templates persisted in D1. sendEmail() routes through
// renderEmailTemplate() which reads by `key`, falls back to a hardcoded
// default when the row is missing or `active=0`. Behavior is unchanged at
// deploy time (the migration seeds rows matching the previous hardcoded
// HTML), but Aaron can edit copy without code + deploy.
export const emailTemplates = sqliteTable('email_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** Stable key matching the existing `template:` arg passed to sendEmail. */
  key: text('key').notNull().unique(),
  subject: text('subject').notNull(),
  /** Body source — markdown or inline HTML. Substituted with vars at send
   *  time, then rendered through `marked`, then wrapped in emailWrapper(). */
  bodyMarkdown: text('body_markdown').notNull(),
  /** JSON array of variable names this template references — used by the
   *  edit UI to surface which vars are available. Informational only. */
  variablesJson: text('variables_json').notNull().default('[]'),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  /** Audit trail — which admin last edited this template. Nullable since
   *  seeded rows have no editor. */
  updatedByUserId: integer('updated_by_user_id'),
  /** 1 = use this DB row; 0 = bypass and fall back to the hardcoded default. */
  active: integer('active').notNull().default(1),
})

// ===== OAUTH CLIENTS (third-party apps registered via DCR, e.g. Claude) =====
export const oauthClients = sqliteTable('oauth_clients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: text('client_id').notNull().unique(),
  clientSecretHash: text('client_secret_hash'), // NULL for public (PKCE) clients
  name: text('name').notNull(),
  redirectUris: text('redirect_uris').notNull(), // JSON array
  grantTypes: text('grant_types').notNull().default('["authorization_code"]'),
  tokenEndpointAuthMethod: text('token_endpoint_auth_method').notNull().default('none'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== OAUTH AUTHORIZATION CODES (single-use, short-lived) =====
export const oauthCodes = sqliteTable('oauth_codes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  codeHash: text('code_hash').notNull().unique(),
  clientId: text('client_id').notNull(),
  userId: integer('user_id').notNull().references(() => users.id),
  redirectUri: text('redirect_uri').notNull(),
  scope: text('scope').notNull().default('mcp'),
  codeChallenge: text('code_challenge').notNull(),
  codeChallengeMethod: text('code_challenge_method').notNull().default('S256'),
  used: integer('used').notNull().default(0),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== OAUTH ACCESS TOKENS =====
export const oauthTokens = sqliteTable('oauth_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tokenHash: text('token_hash').notNull().unique(),
  clientId: text('client_id').notNull(),
  userId: integer('user_id').notNull().references(() => users.id),
  scope: text('scope').notNull().default('mcp'),
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// ===== ARTIFACTS =====
// Student-shared outputs attached to a lesson. Free-form: each artifact
// can be prose (body_markdown), a link (attached_url), or both, with a
// flag indicating the human/AI origin of the final work.
export const artifacts = sqliteTable('artifacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  lessonId: integer('lesson_id').notNull().references(() => lessons.id),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title'), // optional — defaults to "Untitled" in UI if blank
  bodyMarkdown: text('body_markdown'), // prose, reflection, inline content
  attachedUrl: text('attached_url'), // link to external doc/site/image
  generatedBy: text('generated_by').notNull().default('collaborative'),
  // ^ 'human' | 'collaborative' | 'ai' — origin of the final artifact
  visibility: text('visibility').notNull().default('class'),
  // ^ 'class' = visible to all cohort members + instructors
  //   'instructor' = visible only to submitter + instructors/admins
  status: text('status').notNull().default('active'), // 'active' | 'deleted'
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  lessonIdx: index('artifacts_lesson_id_idx').on(t.lessonId),
  userIdx: index('artifacts_user_id_idx').on(t.userId),
}))

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
