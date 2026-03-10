CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`background` text NOT NULL,
	`project_interest` text NOT NULL,
	`referral_source` text NOT NULL,
	`cohort_slug` text DEFAULT 'cohort-2' NOT NULL,
	`pricing_tier` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`user_id` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cohorts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`course_code` text,
	`start_date` text,
	`end_date` text,
	`weeks` integer NOT NULL,
	`price_cents` integer NOT NULL,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cohorts_slug_unique` ON `cohorts` (`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clerk_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`role` text DEFAULT 'student' NOT NULL,
	`bio` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_clerk_id_unique` ON `users` (`clerk_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);