-- Migration 0018 — interest list table + interest_received template seed
--
-- For issue #35: soft signups when applications aren't open. Captures
-- email + (optional) name + a JSON array of which threads of LVB the
-- person wants to be looped in on. Synced to a Resend audience by the
-- /api/interests handler.
--
-- The interest_received template seed is generated from
-- src/lib/email-templates-defaults.ts via:
--   npx tsx scripts/gen-email-templates-seed.ts --inserts-only interest_received

CREATE TABLE `interests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`source_path` text,
	`interests_json` text DEFAULT '[]' NOT NULL,
	`resend_contact_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_interests_email` ON `interests` (`email`);
--> statement-breakpoint
INSERT OR IGNORE INTO `email_templates` (`key`, `subject`, `body_markdown`, `variables_json`, `updated_at`, `active`) VALUES (
  'interest_received',
  'On the list — Learn Vibe Build',
  '<h2>Hey {{firstName}} —</h2>
<p>Thanks for joining the Learn Vibe Build interest list. We''ve added you to {{interestSummary}}.</p>
<p>Cohort 1 is in flight right now, and Cohort 2 is forming as we learn from this run. We''ll be in touch as the dates and shape come into focus.</p>
<div class="email-highlight">
  <p style="margin: 0 0 0.5rem 0;"><strong>While you wait:</strong></p>
  <p style="margin: 0;">If you''ve got something you''re trying to make with AI right now, reply to this email and tell us about it. We love hearing what people are working on, and the cohort design is shaped by what we learn from those conversations.</p>
</div>
<a href="https://learnvibe.build" class="email-cta">Visit the site</a>
<hr class="email-divider">
<p class="email-muted">You''re on the list because you signed up at learnvibe.build. We''ll keep these messages thoughtful and infrequent. Reply anytime — questions, ideas, pushback, all welcome.</p>',
  '["firstName","interestSummary"]',
  (datetime('now')),
  1
);
