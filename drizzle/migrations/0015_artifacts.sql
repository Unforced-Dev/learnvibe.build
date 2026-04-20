CREATE TABLE `artifacts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `lesson_id` integer NOT NULL,
  `user_id` integer NOT NULL,
  `title` text,
  `body_markdown` text,
  `attached_url` text,
  `generated_by` text NOT NULL DEFAULT 'collaborative',
  `visibility` text NOT NULL DEFAULT 'class',
  `status` text NOT NULL DEFAULT 'active',
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
--> statement-breakpoint
CREATE INDEX `artifacts_lesson_id_idx` ON `artifacts` (`lesson_id`);
--> statement-breakpoint
CREATE INDEX `artifacts_user_id_idx` ON `artifacts` (`user_id`);
