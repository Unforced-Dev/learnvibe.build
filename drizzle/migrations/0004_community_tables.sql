-- Phase 2: Community Layer tables
-- Extend users table with profile fields
ALTER TABLE `users` ADD COLUMN `avatar_url` text;
ALTER TABLE `users` ADD COLUMN `website` text;
ALTER TABLE `users` ADD COLUMN `github` text;
ALTER TABLE `users` ADD COLUMN `location` text;
ALTER TABLE `users` ADD COLUMN `updated_at` text;

-- Projects table
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL REFERENCES `users`(`id`),
	`title` text NOT NULL,
	`description` text NOT NULL,
	`url` text,
	`github_url` text,
	`cohort_id` integer REFERENCES `cohorts`(`id`),
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

-- Discussions table
CREATE TABLE `discussions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cohort_id` integer REFERENCES `cohorts`(`id`),
	`lesson_id` integer REFERENCES `lessons`(`id`),
	`user_id` integer NOT NULL REFERENCES `users`(`id`),
	`title` text NOT NULL,
	`body` text NOT NULL,
	`is_pinned` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

-- Comments table
CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`discussion_id` integer NOT NULL REFERENCES `discussions`(`id`),
	`user_id` integer NOT NULL REFERENCES `users`(`id`),
	`parent_id` integer,
	`body` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

-- Lesson progress table
CREATE TABLE `lesson_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL REFERENCES `users`(`id`),
	`lesson_id` integer NOT NULL REFERENCES `lessons`(`id`),
	`cohort_id` integer NOT NULL REFERENCES `cohorts`(`id`),
	`completed_at` text NOT NULL
);

-- Indexes for query performance
CREATE INDEX `idx_projects_user_id` ON `projects`(`user_id`);
CREATE INDEX `idx_discussions_cohort_id` ON `discussions`(`cohort_id`);
CREATE INDEX `idx_discussions_lesson_id` ON `discussions`(`lesson_id`);
CREATE INDEX `idx_comments_discussion_id` ON `comments`(`discussion_id`);
CREATE INDEX `idx_lesson_progress_user_cohort` ON `lesson_progress`(`user_id`, `cohort_id`);
CREATE INDEX `idx_lesson_progress_user_lesson` ON `lesson_progress`(`user_id`, `lesson_id`);
