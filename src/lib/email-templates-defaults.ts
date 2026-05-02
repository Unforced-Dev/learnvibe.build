// Default email templates — source of truth for both the seed migration
// (drizzle/migrations/0017_email_templates_and_log_body.sql) and the
// runtime fallback path in `renderEmailTemplate()`.
//
// When a DB row for a key is missing or `active=0`, the renderer falls back
// to the matching entry here. The 0017 migration also seeds these into the
// `email_templates` table on first apply, so DB-stored is the new default
// but behavior is unchanged at deploy time.
//
// Body sources are markdown with inline HTML — `marked` passes inline HTML
// through, so the existing CSS classes (`email-cta`, `email-highlight`,
// `email-divider`, `email-muted`) keep working. Variables are `{{name}}`
// style, substituted at send time before markdown render.
//
// The `variables` list is informational — the edit UI surfaces it as "this
// template uses: {{firstName}}, …" so admin knows what's safe to reference.

export interface EmailTemplateDefault {
  subject: string
  bodyMarkdown: string
  variables: string[]
}

export const DEFAULT_TEMPLATES: Record<string, EmailTemplateDefault> = {
  application_received: {
    subject: 'Application received — Learn Vibe Build',
    variables: ['firstName'],
    bodyMarkdown: `<h2>Thanks for applying, {{firstName}}</h2>
<p>We've received your application for Cohort 1. We'll review it and get back to you soon — typically within a few days.</p>
<div class="email-highlight">
  <p style="margin: 0 0 0.5rem 0;"><strong>One quick step while you wait:</strong></p>
  <p style="margin: 0;">Create your account using <strong>this same email address</strong> — that way when we approve you, your enrollment links automatically and you can jump right in.</p>
</div>
<a href="https://learnvibe.build/sign-up" class="email-cta">Create Your Account</a>
<hr class="email-divider">
<p class="email-muted">You can also check your application status anytime at <a href="https://learnvibe.build/apply/status" style="color: #e8612a; text-decoration: none;">learnvibe.build/apply/status</a>. Questions? Reply to this email or reach out at ag@unforced.dev.</p>`,
  },

  application_approved: {
    subject: "You're approved! — Learn Vibe Build Cohort 1",
    variables: ['firstName', 'tierLabel', 'amountFormatted', 'paymentUrl'],
    bodyMarkdown: `<h2>You're in, {{firstName}}!</h2>
<p>Your application for Cohort 1 has been approved. We're excited to have you.</p>
<div class="email-highlight">
  <p><strong>{{tierLabel}}</strong> — {{amountFormatted}}</p>
</div>
<p>Complete your payment to secure your spot:</p>
<a href="{{paymentUrl}}" class="email-cta">Pay {{amountFormatted}} & Enroll →</a>
<hr class="email-divider">
<p class="email-muted">If you haven't yet, also <a href="https://learnvibe.build/sign-up" style="color: #e8612a; text-decoration: none;">create your account</a> using <strong>this same email address</strong> — that way you can access the cohort site as soon as you're enrolled. The course starts in April 2026; we'll send more details as we get closer. Questions? Just reply.</p>`,
  },

  application_approved_sponsored: {
    subject: "You're in! — Learn Vibe Build Cohort 1",
    variables: ['firstName', 'paymentUrl'],
    bodyMarkdown: `<h2>Welcome, {{firstName}}!</h2>
<p>Great news — your application for Cohort 1 has been approved, and your spot has been sponsored. No payment needed.</p>
<p>Complete your enrollment to get started:</p>
<a href="{{paymentUrl}}" class="email-cta">Complete Enrollment →</a>
<hr class="email-divider">
<p class="email-muted">The course starts in April 2026. We'll send you details as we get closer. In the meantime, feel free to reply with any questions.</p>`,
  },

  application_rejected: {
    subject: 'Update on your application — Learn Vibe Build',
    variables: ['firstName'],
    bodyMarkdown: `<h2>Hi {{firstName}},</h2>
<p>Thank you for applying to Learn Vibe Build Cohort 1. After careful consideration, we weren't able to offer you a spot in this cohort.</p>
<p>This isn't a reflection of your potential — our cohorts are small and we can only take a limited number of participants each round.</p>
<p>We'd love to see you apply again for a future cohort. We're always expanding what we offer, and there may be a better fit down the road.</p>
<hr class="email-divider">
<p class="email-muted">If you have any questions, feel free to reply to this email.</p>`,
  },

  application_price_changed: {
    subject: 'Your Cohort 1 pricing has been updated — Learn Vibe Build',
    variables: ['firstName', 'tierLabel', 'oldAmountFormatted', 'newAmountFormatted', 'paymentUrl'],
    bodyMarkdown: `<h2>Hi {{firstName}},</h2>
<p>We've updated the pricing on your Cohort 1 enrollment.</p>
<div class="email-highlight">
  <p><strong>New price:</strong> {{tierLabel}} — {{newAmountFormatted}}<br>
  <span style="color: #6b7280; font-size: 0.9em;">(was {{oldAmountFormatted}})</span></p>
</div>
<p>If you haven't paid yet, the updated amount will apply when you do:</p>
<a href="{{paymentUrl}}" class="email-cta">Pay {{newAmountFormatted}} & Enroll →</a>
<hr class="email-divider">
<p class="email-muted">Questions or need a different arrangement? Just reply — cost should never be a barrier.</p>`,
  },

  application_price_changed_sponsored: {
    subject: 'Your Cohort 1 spot is now sponsored — Learn Vibe Build',
    variables: ['firstName', 'paymentUrl'],
    bodyMarkdown: `<h2>Good news, {{firstName}}!</h2>
<p>We've updated your enrollment — your spot in Cohort 1 is now <strong>sponsored</strong>. No payment required.</p>
<p>Complete your enrollment to get started:</p>
<a href="{{paymentUrl}}" class="email-cta">Complete Enrollment →</a>
<hr class="email-divider">
<p class="email-muted">Questions? Reply to this email or reach out at ag@unforced.dev.</p>`,
  },

  enrollment_confirmed_no_account: {
    subject: 'Welcome to {{cohortTitle}} — Learn Vibe Build',
    variables: ['firstName', 'cohortTitle'],
    bodyMarkdown: `<h2>You're enrolled, {{firstName}}!</h2>
<p>You're officially part of {{cohortTitle}}. Welcome to the community.</p>
<div class="email-highlight">
  <p><strong>One last step:</strong> Create your account using <strong>this same email address</strong> so you can access the cohort site. Your enrollment will link automatically.</p>
</div>
<a href="https://learnvibe.build/sign-up" class="email-cta">Create Your Account →</a>
<hr class="email-divider">
<p class="email-muted">Already have an account? <a href="https://learnvibe.build/dashboard" style="color: #e8612a; text-decoration: none;">Go to your dashboard</a>.</p>`,
  },

  interest_received: {
    subject: 'On the list — Learn Vibe Build',
    variables: ['firstName', 'interestSummary'],
    bodyMarkdown: `<h2>Hey {{firstName}} —</h2>
<p>Thanks for joining the Learn Vibe Build interest list. We've added you to {{interestSummary}}.</p>
<p>Cohort 1 is in flight right now, and Cohort 2 is forming as we learn from this run. We'll be in touch as the dates and shape come into focus.</p>
<div class="email-highlight">
  <p style="margin: 0 0 0.5rem 0;"><strong>While you wait:</strong></p>
  <p style="margin: 0;">If you've got something you're trying to make with AI right now, reply to this email and tell us about it. We love hearing what people are working on, and the cohort design is shaped by what we learn from those conversations.</p>
</div>
<a href="https://learnvibe.build" class="email-cta">Visit the site</a>
<hr class="email-divider">
<p class="email-muted">You're on the list because you signed up at learnvibe.build. We'll keep these messages thoughtful and infrequent. Reply anytime — questions, ideas, pushback, all welcome.</p>`,
  },

  enrollment_confirmed_has_account: {
    subject: "You're enrolled in {{cohortTitle}} — Learn Vibe Build",
    variables: ['firstName', 'cohortTitle'],
    bodyMarkdown: `<h2>You're enrolled, {{firstName}}!</h2>
<p>You're officially part of {{cohortTitle}}. Welcome to the community.</p>
<div class="email-highlight">
  <p><strong>What's next:</strong> We'll send you session details as we get closer to the start date. You can access the cohort site anytime via your dashboard.</p>
</div>
<a href="https://learnvibe.build/dashboard" class="email-cta">Go to Your Dashboard →</a>
<hr class="email-divider">
<p class="email-muted">Questions? Just reply to this email.</p>`,
  },
}

/** Stable list of template keys, in display order for the admin templates page. */
export const TEMPLATE_KEYS: ReadonlyArray<keyof typeof DEFAULT_TEMPLATES> = [
  'application_received',
  'application_approved',
  'application_approved_sponsored',
  'application_rejected',
  'application_price_changed',
  'application_price_changed_sponsored',
  'enrollment_confirmed_no_account',
  'enrollment_confirmed_has_account',
  'interest_received',
]

/** Human-readable labels for each template key — used by admin UI. */
export const TEMPLATE_LABELS: Record<string, string> = {
  application_received: 'Application received',
  application_approved: 'Approved — paid tier',
  application_approved_sponsored: 'Approved — sponsored ($0)',
  application_rejected: 'Rejected',
  application_price_changed: 'Price changed — paid tier',
  application_price_changed_sponsored: 'Price changed — now sponsored',
  enrollment_confirmed_no_account: 'Enrollment confirmed — no account yet',
  enrollment_confirmed_has_account: 'Enrollment confirmed — account exists',
  interest_received: 'Interest list — confirmation',
  // Logged template keys that don't have an editable template here — used
  // for label-only purposes on the email log table.
  broadcast: 'Broadcast',
  enrollment_confirmed: 'Enrollment (legacy)',
}
