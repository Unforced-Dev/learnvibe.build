CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`application_id` integer,
	`cohort_id` integer,
	`stripe_checkout_session_id` text,
	`stripe_payment_intent_id` text,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`paid_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_stripe_checkout_session_id_unique` ON `payments` (`stripe_checkout_session_id`);