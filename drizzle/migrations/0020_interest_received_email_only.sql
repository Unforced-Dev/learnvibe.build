-- Migration 0020 — interest_received template, email-only signup copy
--
-- The /interest signup form simplified to email-only (no name, no tags).
-- The previously seeded template referenced {{firstName}} and
-- {{interestSummary}} — both now empty for new signups, which would render
-- literal "{{interestSummary}}" text in the email body. This migration
-- updates the live D1 row to match the new default in
-- src/lib/email-templates-defaults.ts.
--
-- Admin-edit-safe: WHERE clause matches the original 0018 seed body. If
-- admin edited via the template editor between #36 landing and now, the
-- migration silently no-ops and preserves their edit.
--
-- Also drops the variables_json list to '[]' since the template no longer
-- references any variables. The variables list is informational only — it
-- doesn't gate substitution — so this is purely a UI cleanliness move on
-- the template editor page.

UPDATE `email_templates`
SET
  `body_markdown` = '<h2>Thanks for joining the list —</h2>
<p>You''re on the Learn Vibe Build interest list. Cohort 1 is in flight right now, and Cohort 2 is forming as we learn from this run. We''ll be in touch as the dates and shape come into focus.</p>
<div class="email-highlight">
  <p style="margin: 0 0 0.5rem 0;"><strong>While you wait:</strong></p>
  <p style="margin: 0;">If you''ve got something you''re trying to make with AI right now, reply to this email and tell us about it. We love hearing what people are working on, and the cohort design is shaped by what we learn from those conversations.</p>
</div>
<a href="https://learnvibe.build" class="email-cta">Visit the site</a>
<hr class="email-divider">
<p class="email-muted">You''re on the list because you signed up at learnvibe.build. We''ll keep these messages thoughtful and infrequent. Reply anytime — questions, ideas, pushback, all welcome.</p>',
  `variables_json` = '[]',
  `updated_at` = (datetime('now'))
WHERE `key` = 'interest_received'
  AND `body_markdown` = '<h2>Hey {{firstName}} —</h2>
<p>Thanks for joining the Learn Vibe Build interest list. We''ve added you to {{interestSummary}}.</p>
<p>Cohort 1 is in flight right now, and Cohort 2 is forming as we learn from this run. We''ll be in touch as the dates and shape come into focus.</p>
<div class="email-highlight">
  <p style="margin: 0 0 0.5rem 0;"><strong>While you wait:</strong></p>
  <p style="margin: 0;">If you''ve got something you''re trying to make with AI right now, reply to this email and tell us about it. We love hearing what people are working on, and the cohort design is shaped by what we learn from those conversations.</p>
</div>
<a href="https://learnvibe.build" class="email-cta">Visit the site</a>
<hr class="email-divider">
<p class="email-muted">You''re on the list because you signed up at learnvibe.build. We''ll keep these messages thoughtful and infrequent. Reply anytime — questions, ideas, pushback, all welcome.</p>';
