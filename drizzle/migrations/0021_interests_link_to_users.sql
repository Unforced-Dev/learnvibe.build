-- Migration 0021 — link interests rows to users by email
--
-- For issue #44: interest signup is the first step of the funnel
-- (interest → signup → application → enrollment). Until now, interest
-- rows were siloed — even when the same person later created an
-- account, there was no DB link. This migration adds the FK and
-- backfills existing rows.
--
-- Two-step:
--   1. ALTER TABLE adds the user_id column (nullable; legacy rows
--      that don't match a user stay NULL).
--   2. UPDATE backfills user_id from the users table by email match.
--      Both sides are normalized to lowercase via LOWER() since the
--      apply form lowercases before insert (since #25) but legacy
--      rows from before that may have mixed case.
--
-- After this lands, runtime code (POST /api/interests + syncUser)
-- maintains the link going forward — see src/routes/interest.tsx
-- and src/lib/auth.ts.

ALTER TABLE `interests` ADD COLUMN `user_id` integer REFERENCES `users`(`id`);
--> statement-breakpoint
UPDATE `interests`
SET `user_id` = (
  SELECT `id` FROM `users`
  WHERE LOWER(`users`.`email`) = LOWER(`interests`.`email`)
  LIMIT 1
)
WHERE `user_id` IS NULL;
