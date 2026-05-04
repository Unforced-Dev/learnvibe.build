-- Migration 0022 — lessons.transcript_summary column
--
-- For Week 3 / Connectors session: get_lesson defaults to a short
-- transcript summary (admin-written) instead of the full ~30-100K-char
-- transcript markdown. The full transcript moves to get_lesson_transcript.
--
-- Schema-only addition. Existing rows stay NULL until Aaron summarizes
-- them — typically by pulling the transcript via the new
-- get_lesson_transcript MCP tool, asking Claude to summarize, and saving
-- back via admin_upsert_lesson.

ALTER TABLE `lessons` ADD COLUMN `transcript_summary` text;
