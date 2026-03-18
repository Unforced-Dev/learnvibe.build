-- Seed Cohort 2: Practice
-- Run against D1 database: npx wrangler d1 execute learnvibe-db --remote --file=seed-cohort2.sql

INSERT OR IGNORE INTO cohorts (slug, title, description, start_date, end_date, weeks, price_cents, is_public, status)
VALUES (
  'cohort-2',
  'Cohort 2: Practice',
  '6 weeks of building with AI as your creative partner. Weekly sessions, co-working hours, and a growing community. April–May 2026, Boulder CO & remote.',
  '2026-04-06',
  '2026-05-15',
  6,
  50000,
  0,
  'enrolling'
);
