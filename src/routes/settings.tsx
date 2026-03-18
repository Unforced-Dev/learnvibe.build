import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { Layout } from '../components/Layout'
import { getDb } from '../db'
import { users, apiKeys } from '../db/schema'
import { generateApiKey, hashApiKey, getKeyPrefix } from '../lib/api-auth'
import type { AppContext } from '../types'

const settingsRoutes = new Hono<AppContext>()

// Profile settings — /settings/profile
settingsRoutes.get('/settings/profile', async (c) => {
  const user = c.get('user')

  if (!user) return c.redirect('/sign-in')

  const db = getDb(c.env.DB)
  const profile = await db.select().from(users).where(eq(users.id, user.id)).get()

  if (!profile) return c.redirect('/dashboard')

  const saved = c.req.query('saved')
  const error = c.req.query('error')

  return c.html(
    <Layout title="Edit Profile" user={user}>
      <div class="page-section" style="max-width: 600px; margin: 0 auto;">
        <a href="/community" class="back-link">← Community</a>

        <p class="section-label">Settings</p>
        <h2>Edit Your Profile</h2>

        {saved && (
          <div style="margin-top: 1rem; padding: 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #166534;">
            Profile updated successfully!
          </div>
        )}

        {error === 'missing_fields' && (
          <div style="margin-top: 1rem; padding: 1rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b;">
            Please fill in the required fields.
          </div>
        )}

        {error === 'server_error' && (
          <div style="margin-top: 1rem; padding: 1rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b;">
            Something went wrong. Please try again.
          </div>
        )}

        <form method="POST" action="/api/profile" style="margin-top: 2rem;">
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label for="name" style="display: block; font-weight: 500; margin-bottom: 0.5rem; font-size: 0.9rem;">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={profile.name || ''}
              required
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem; background: var(--surface); color: var(--text);"
            />
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label for="bio" style="display: block; font-weight: 500; margin-bottom: 0.5rem; font-size: 0.9rem;">Bio</label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              placeholder="Tell the community a bit about yourself..."
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem; background: var(--surface); color: var(--text); resize: vertical; font-family: var(--font-body);"
            >{profile.bio || ''}</textarea>
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label for="location" style="display: block; font-weight: 500; margin-bottom: 0.5rem; font-size: 0.9rem;">Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={profile.location || ''}
              placeholder="Boulder, CO"
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem; background: var(--surface); color: var(--text);"
            />
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label for="website" style="display: block; font-weight: 500; margin-bottom: 0.5rem; font-size: 0.9rem;">Website</label>
            <input
              type="url"
              id="website"
              name="website"
              value={profile.website || ''}
              placeholder="https://yoursite.com"
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem; background: var(--surface); color: var(--text);"
            />
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label for="github" style="display: block; font-weight: 500; margin-bottom: 0.5rem; font-size: 0.9rem;">GitHub Username</label>
            <input
              type="text"
              id="github"
              name="github"
              value={profile.github || ''}
              placeholder="your-username"
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem; background: var(--surface); color: var(--text);"
            />
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label for="avatar_url" style="display: block; font-weight: 500; margin-bottom: 0.5rem; font-size: 0.9rem;">Avatar URL</label>
            <input
              type="url"
              id="avatar_url"
              name="avatar_url"
              value={profile.avatarUrl || ''}
              placeholder="https://example.com/your-photo.jpg"
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem; background: var(--surface); color: var(--text);"
            />
            <p style="margin-top: 0.25rem; font-size: 0.8rem; color: var(--text-tertiary);">
              Paste a URL to your profile photo. Tip: Use your GitHub avatar ({profile.github ? `https://github.com/${profile.github}.png` : 'https://github.com/username.png'})
            </p>
          </div>

          <div style="display: flex; gap: 1rem; align-items: center; margin-top: 2rem;">
            <button
              type="submit"
              style="background: var(--accent); color: white; border: none; padding: 0.75rem 2rem; border-radius: 6px; font-size: 1rem; font-weight: 500; cursor: pointer;"
            >
              Save Profile
            </button>
            <a href={`/members/${user.id}`} style="color: var(--text-secondary); font-size: 0.9rem;">
              View your profile →
            </a>
          </div>
        </form>

        <div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border);">
          <p style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-tertiary);">
            {user.email} · {user.role}
          </p>
        </div>
      </div>
    </Layout>
  )
})

// API Key management — /settings/api-keys
settingsRoutes.get('/settings/api-keys', async (c) => {
  const user = c.get('user')

  if (!user) return c.redirect('/sign-in')

  const db = getDb(c.env.DB)
  const keys = await db.select().from(apiKeys)
    .where(and(eq(apiKeys.userId, user.id), eq(apiKeys.status, 'active')))
    .all()

  const newKey = c.req.query('new_key')
  const created = c.req.query('created')
  const revoked = c.req.query('revoked')
  const error = c.req.query('error')

  return c.html(
    <Layout title="API Keys" user={user}>
      <div class="page-section" style="max-width: 600px; margin: 0 auto;">
        <a href="/settings/profile" class="back-link">← Profile Settings</a>

        <p class="section-label">Settings</p>
        <h2>API Keys</h2>
        <p class="lead" style="margin-top: 0.5rem;">
          Use API keys to connect your AI assistant (MCP) to Learn Vibe Build.
        </p>

        {newKey && (
          <div style="margin-top: 1.5rem; padding: 1.25rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
            <p style="color: #166534; font-weight: 600; margin-bottom: 0.5rem;">New API Key Created</p>
            <p style="color: #15803d; font-size: 0.9rem; margin-bottom: 0.75rem;">
              Copy this key now — it won't be shown again.
            </p>
            <div style="font-family: var(--font-mono); font-size: 0.85rem; background: white; padding: 0.75rem; border-radius: 4px; word-break: break-all; border: 1px solid #bbf7d0;">
              {newKey}
            </div>
          </div>
        )}

        {created && !newKey && (
          <div style="margin-top: 1rem; padding: 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #166534;">
            API key created successfully.
          </div>
        )}

        {revoked && (
          <div style="margin-top: 1rem; padding: 1rem; background: var(--surface); border-radius: 8px; color: var(--text-secondary);">
            API key revoked.
          </div>
        )}

        {error === 'missing_name' && (
          <div style="margin-top: 1rem; padding: 1rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b;">
            Please provide a name for the key.
          </div>
        )}

        <form method="POST" action="/api/api-keys" style="margin-top: 2rem; display: flex; gap: 0.75rem; align-items: flex-end;">
          <div style="flex: 1;">
            <label for="name" style="display: block; font-weight: 500; margin-bottom: 0.5rem; font-size: 0.9rem;">New Key Name</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              placeholder="My MCP Server"
              style="width: 100%; padding: 0.65rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.95rem; background: var(--surface); color: var(--text);"
            />
          </div>
          <button
            type="submit"
            style="background: var(--accent); color: white; border: none; padding: 0.65rem 1.25rem; border-radius: 6px; font-size: 0.95rem; font-weight: 500; cursor: pointer; white-space: nowrap;"
          >
            Create Key
          </button>
        </form>

        {keys.length > 0 ? (
          <div class="api-key-list" style="margin-top: 2rem;">
            <h3 style="font-family: var(--font-display); margin-bottom: 1rem;">Active Keys</h3>
            {keys.map((key) => (
              <div class="api-key-item">
                <div>
                  <div class="api-key-name">{key.name}</div>
                  <div class="api-key-value">{key.keyPrefix}</div>
                  <div class="api-key-meta">
                    Created {new Date(key.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {key.lastUsedAt && <> · Last used {new Date(key.lastUsedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
                  </div>
                </div>
                <form method="POST" action={`/api/api-keys/${key.id}/revoke`}>
                  <button
                    type="submit"
                    style="background: none; border: 1px solid #fecaca; color: #991b1b; padding: 0.4rem 0.75rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer;"
                  >
                    Revoke
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <div class="empty-state" style="margin-top: 3rem;">
            <p>No API keys yet. Create one to connect your AI assistant.</p>
          </div>
        )}

        <div style="margin-top: 3rem; padding: 1.5rem; background: var(--surface); border-radius: 8px;">
          <h3 style="font-family: var(--font-display); font-size: 1rem; margin-bottom: 0.75rem;">How to use API keys</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.7;">
            Pass your API key as a Bearer token in the Authorization header:
          </p>
          <pre style="background: var(--dark); color: #e0e0e0; padding: 1rem; border-radius: 6px; margin-top: 0.75rem; font-size: 0.85rem; overflow-x: auto;">
{`curl https://learnvibe.build/api/v1/me \\
  -H "Authorization: Bearer lvb_your_key_here"`}
          </pre>
          <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.7; margin-top: 0.75rem;">
            Full API docs: <a href="/api/v1/docs" style="color: var(--accent);">learnvibe.build/api/v1/docs</a>
          </p>
        </div>
      </div>
    </Layout>
  )
})

export default settingsRoutes
