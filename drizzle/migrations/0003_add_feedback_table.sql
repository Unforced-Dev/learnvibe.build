CREATE TABLE `feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`cohort_slug` text,
	`rating` integer,
	`highlight` text,
	`testimonial` text,
	`improvement` text,
	`can_feature` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
