import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { createClerkClient } from '@clerk/backend'
import { Layout } from '../components/Layout'
import { syncUser, isClerkConfigured } from '../lib/auth'
import type { AppContext } from '../types'

const auth = new Hono<AppContext>()

// ===== SIGN-IN PAGE =====
auth.get('/sign-in', (c) => {
  const pubKey = c.env.CLERK_PUBLISHABLE_KEY

  if (!isClerkConfigured(c)) {
    return c.html(
      <Layout title="Sign In" user={null}>
        <div class="page-section" style="max-width: 500px; margin: 0 auto; text-align: center; padding: 6rem 0;">
          <h2>Sign In</h2>
          <p style="margin-top: 1rem; color: var(--text-secondary);">
            Authentication is not yet configured. Check back soon.
          </p>
          <a href="/" class="back-link" style="margin-top: 2rem; display: inline-block;">← Back to Home</a>
        </div>
      </Layout>
    )
  }

  return c.html(
    <Layout title="Sign In" user={null}>
      <div class="page-section" style="max-width: 500px; margin: 0 auto; padding: 4rem 0;">
        <div id="clerk-sign-in" style="display: flex; justify-content: center;"></div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js"></script>
      <script dangerouslySetInnerHTML={{ __html: `
        (async function() {
          const clerk = new window.Clerk('${pubKey}');
          await clerk.load();
          if (clerk.user) {
            window.location.href = '/dashboard';
          } else {
            clerk.mountSignIn(document.getElementById('clerk-sign-in'), {
              afterSignInUrl: '/auth/callback',
              afterSignUpUrl: '/auth/callback',
            });
          }
        })();
      `}} />
    </Layout>
  )
})

// ===== SIGN-UP PAGE =====
auth.get('/sign-up', (c) => {
  const pubKey = c.env.CLERK_PUBLISHABLE_KEY

  if (!isClerkConfigured(c)) {
    return c.html(
      <Layout title="Sign Up" user={null}>
        <div class="page-section" style="max-width: 500px; margin: 0 auto; text-align: center; padding: 6rem 0;">
          <h2>Sign Up</h2>
          <p style="margin-top: 1rem; color: var(--text-secondary);">
            Authentication is not yet configured. Check back soon.
          </p>
          <a href="/" class="back-link" style="margin-top: 2rem; display: inline-block;">← Back to Home</a>
        </div>
      </Layout>
    )
  }

  return c.html(
    <Layout title="Sign Up" user={null}>
      <div class="page-section" style="max-width: 500px; margin: 0 auto; padding: 4rem 0;">
        <div id="clerk-sign-up" style="display: flex; justify-content: center;"></div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js"></script>
      <script dangerouslySetInnerHTML={{ __html: `
        (async function() {
          const clerk = new window.Clerk('${pubKey}');
          await clerk.load();
          if (clerk.user) {
            window.location.href = '/dashboard';
          } else {
            clerk.mountSignUp(document.getElementById('clerk-sign-up'), {
              afterSignInUrl: '/auth/callback',
              afterSignUpUrl: '/auth/callback',
            });
          }
        })();
      `}} />
    </Layout>
  )
})

// ===== AUTH CALLBACK — Sync user to D1 =====
auth.get('/auth/callback', async (c) => {
  if (!isClerkConfigured(c)) {
    return c.redirect('/')
  }

  try {
    const authState = getAuth(c)
    if (!authState?.userId) {
      return c.redirect('/sign-in')
    }

    // Use Clerk Backend API to get user details
    const clerk = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY })
    const clerkUser = await clerk.users.getUser(authState.userId)

    // Sync to our DB
    await syncUser(
      c,
      clerkUser.id,
      clerkUser.emailAddresses[0]?.emailAddress || '',
      `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null
    )

    return c.redirect('/dashboard')
  } catch (e) {
    console.error('Auth callback error:', e)
    return c.redirect('/dashboard')
  }
})

// ===== SIGN-OUT =====
auth.get('/sign-out', (c) => {
  const pubKey = c.env.CLERK_PUBLISHABLE_KEY

  if (!isClerkConfigured(c)) {
    return c.redirect('/')
  }

  return c.html(
    <Layout title="Signing Out" user={null}>
      <div class="page-section" style="max-width: 500px; margin: 0 auto; text-align: center; padding: 6rem 0;">
        <p style="color: var(--text-secondary);">Signing out...</p>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js"></script>
      <script dangerouslySetInnerHTML={{ __html: `
        (async function() {
          const clerk = new window.Clerk('${pubKey}');
          await clerk.load();
          await clerk.signOut();
          window.location.href = '/';
        })();
      `}} />
    </Layout>
  )
})

export default auth
