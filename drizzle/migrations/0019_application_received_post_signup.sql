-- Migration 0019 — application_received post-signup copy update
--
-- For issue #25: applying now requires a Clerk account (apply-time signup),
-- so the "Create your account" CTA in application_received is vestigial.
-- This migration updates the live D1 row to match the post-signup default
-- in src/lib/email-templates-defaults.ts.
--
-- Admin-edit-safe: the WHERE clause matches against the original 0017 seed
-- body. If admin has already edited the template through the new UI, the
-- WHERE clause won't match and this migration silently no-ops, preserving
-- their edit. The canonical default in code is what matters going forward;
-- this migration just keeps the live DB row coherent with that default.

UPDATE `email_templates`
SET
  `body_markdown` = '<h2>Thanks for applying, {{firstName}}</h2>
<p>We''ve received your application for Cohort 1. We''ll review it and get back to you soon — typically within a few days.</p>
<p>You can check your application status anytime from <a href="https://learnvibe.build/dashboard" style="color: #e8612a; text-decoration: none;">your dashboard</a>.</p>
<hr class="email-divider">
<p class="email-muted">Questions? Reply to this email or reach out at ag@unforced.dev.</p>',
  `updated_at` = (datetime('now'))
WHERE `key` = 'application_received'
  AND `body_markdown` = '<h2>Thanks for applying, {{firstName}}</h2>
<p>We''ve received your application for Cohort 1. We''ll review it and get back to you soon — typically within a few days.</p>
<div class="email-highlight">
  <p style="margin: 0 0 0.5rem 0;"><strong>One quick step while you wait:</strong></p>
  <p style="margin: 0;">Create your account using <strong>this same email address</strong> — that way when we approve you, your enrollment links automatically and you can jump right in.</p>
</div>
<a href="https://learnvibe.build/sign-up" class="email-cta">Create Your Account</a>
<hr class="email-divider">
<p class="email-muted">You can also check your application status anytime at <a href="https://learnvibe.build/apply/status" style="color: #e8612a; text-decoration: none;">learnvibe.build/apply/status</a>. Questions? Reply to this email or reach out at ag@unforced.dev.</p>';
