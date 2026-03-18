-- API Keys table for MCP/REST API authentication
CREATE TABLE `api_keys` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `user_id` integer NOT NULL REFERENCES `users`(`id`),
    `name` text NOT NULL,
    `key_hash` text NOT NULL UNIQUE,
    `key_prefix` text NOT NULL,
    `scopes` text NOT NULL DEFAULT 'read',
    `last_used_at` text,
    `expires_at` text,
    `status` text NOT NULL DEFAULT 'active',
    `created_at` text NOT NULL
);

CREATE INDEX `idx_api_keys_user_id` ON `api_keys`(`user_id`);
CREATE INDEX `idx_api_keys_key_hash` ON `api_keys`(`key_hash`);
