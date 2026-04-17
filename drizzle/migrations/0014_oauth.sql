-- OAuth 2.1 Authorization Server tables.
-- Third-party clients (Claude, etc.) register dynamically, get an access
-- token scoped to a Clerk-authenticated user, and use it as Bearer on /mcp.

CREATE TABLE IF NOT EXISTS oauth_clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL UNIQUE,
  -- Optional: PKCE-only public clients have NULL client_secret_hash.
  client_secret_hash TEXT,
  name TEXT NOT NULL,
  redirect_uris TEXT NOT NULL, -- JSON array of allowed redirect_uris
  grant_types TEXT NOT NULL DEFAULT '["authorization_code"]', -- JSON array
  token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none', -- 'none' = public client
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS oauth_clients_client_id ON oauth_clients (client_id);

CREATE TABLE IF NOT EXISTS oauth_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_hash TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  redirect_uri TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'mcp',
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',
  used INTEGER NOT NULL DEFAULT 0, -- 1 once exchanged; single-use
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS oauth_codes_client_id ON oauth_codes (client_id);
CREATE INDEX IF NOT EXISTS oauth_codes_user_id ON oauth_codes (user_id);

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  scope TEXT NOT NULL DEFAULT 'mcp',
  expires_at TEXT NOT NULL,
  revoked_at TEXT, -- nullable; set when user revokes
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS oauth_tokens_user_id ON oauth_tokens (user_id);
CREATE INDEX IF NOT EXISTS oauth_tokens_client_id ON oauth_tokens (client_id);
