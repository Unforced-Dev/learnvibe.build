CREATE TABLE `enrollments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`cohort_id` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`enrolled_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cohort_id` integer NOT NULL,
	`week_number` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`date` text,
	`content_markdown` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text DEFAULT 'cohort_alumni' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`started_at` text NOT NULL,
	`expires_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`background` text NOT NULL,
	`project_interest` text NOT NULL,
	`referral_source` text NOT NULL,
	`cohort_slug` text DEFAULT 'cohort-2' NOT NULL,
	`pricing_tier` text DEFAULT 'pending' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`approved_at` text,
	`user_id` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_applications`("id", "name", "email", "background", "project_interest", "referral_source", "cohort_slug", "pricing_tier", "status", "notes", "approved_at", "user_id", "created_at") SELECT "id", "name", "email", "background", "project_interest", "referral_source", "cohort_slug", "pricing_tier", "status", "notes", "approved_at", "user_id", "created_at" FROM `applications`;--> statement-breakpoint
DROP TABLE `applications`;--> statement-breakpoint
ALTER TABLE `__new_applications` RENAME TO `applications`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `cohorts` ADD `description` text;--> statement-breakpoint
ALTER TABLE `cohorts` ADD `is_public` integer DEFAULT 0 NOT NULL;