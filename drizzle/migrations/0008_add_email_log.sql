CREATE TABLE `email_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`to` text NOT NULL,
	`subject` text NOT NULL,
	`template` text NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`error` text,
	`sent_at` text NOT NULL
);
